import { redis } from "../redis.js";
import EventEmitter from "events";

/**
 * Service Customer Support cho hệ thống
 */
class CustomerSupportService extends EventEmitter {
  constructor() {
    super();
    this.tickets = new Map();
    this.categories = new Map();
    this.priorities = new Map();
    this.agents = new Map();
    this.initializeSupportData();
  }

  /**
   * Khởi tạo dữ liệu support
   */
  initializeSupportData() {
    // Support categories
    this.categories.set('technical', {
      id: 'technical',
      name: 'Technical Support',
      description: 'Technical issues and bugs',
      color: '#ef4444',
      icon: '🔧'
    });

    this.categories.set('billing', {
      id: 'billing',
      name: 'Billing & Payments',
      description: 'Payment and subscription issues',
      color: '#10b981',
      icon: '💳'
    });

    this.categories.set('feature', {
      id: 'feature',
      name: 'Feature Request',
      description: 'New feature suggestions',
      color: '#3b82f6',
      icon: '💡'
    });

    this.categories.set('account', {
      id: 'account',
      name: 'Account Issues',
      description: 'Account management problems',
      color: '#f59e0b',
      icon: '👤'
    });

    this.categories.set('general', {
      id: 'general',
      name: 'General Inquiry',
      description: 'General questions and information',
      color: '#6b7280',
      icon: '❓'
    });

    // Priority levels
    this.priorities.set('low', {
      id: 'low',
      name: 'Low',
      description: 'Non-urgent issues',
      color: '#10b981',
      responseTime: 48 // hours
    });

    this.priorities.set('medium', {
      id: 'medium',
      name: 'Medium',
      description: 'Standard priority',
      color: '#f59e0b',
      responseTime: 24 // hours
    });

    this.priorities.set('high', {
      id: 'high',
      name: 'High',
      description: 'Urgent issues',
      color: '#ef4444',
      responseTime: 8 // hours
    });

    this.priorities.set('critical', {
      id: 'critical',
      name: 'Critical',
      description: 'System down or major issues',
      color: '#dc2626',
      responseTime: 2 // hours
    });

    // Ticket statuses
    this.statuses = {
      open: { name: 'Open', color: '#3b82f6' },
      in_progress: { name: 'In Progress', color: '#f59e0b' },
      pending_customer: { name: 'Pending Customer', color: '#6b7280' },
      resolved: { name: 'Resolved', color: '#10b981' },
      closed: { name: 'Closed', color: '#6b7280' }
    };
  }

  /**
   * Tạo support ticket
   */
  async createTicket(ticketData) {
    try {
      const ticket = {
        id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketNumber: this.generateTicketNumber(),
        userId: ticketData.userId,
        subject: ticketData.subject,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority || 'medium',
        status: 'open',
        assignedAgent: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
        closedAt: null,
        attachments: ticketData.attachments || [],
        tags: ticketData.tags || [],
        metadata: ticketData.metadata || {},
        customerInfo: ticketData.customerInfo || {},
        estimatedResolution: this.calculateEstimatedResolution(ticketData.priority || 'medium')
      };

      await redis.hset(`support:ticket:${ticket.id}`, ticket);
      this.tickets.set(ticket.id, ticket);
      
      // Add to user's ticket list
      await redis.lpush(`user:${ticket.userId}:tickets`, ticket.id);
      
      this.emit('ticket:created', ticket);
      return ticket;
    } catch (error) {
      console.error("Failed to create ticket:", error.message);
      throw error;
    }
  }

  /**
   * Tạo ticket number
   */
  generateTicketNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `TK-${year}${month}${day}-${random}`;
  }

  /**
   * Tính toán thời gian giải quyết ước tính
   */
  calculateEstimatedResolution(priority) {
    const priorityData = this.priorities.get(priority);
    if (!priorityData) return null;

    const estimatedTime = new Date();
    estimatedTime.setHours(estimatedTime.getHours() + priorityData.responseTime);
    return estimatedTime.toISOString();
  }

  /**
   * Cập nhật ticket
   */
  async updateTicket(ticketId, updates) {
    try {
      const ticket = await redis.hgetall(`support:ticket:${ticketId}`);
      if (!ticket || !ticket.id) {
        throw new Error("Ticket not found");
      }

      Object.assign(ticket, updates);
      ticket.updatedAt = new Date().toISOString();

      // Update status timestamps
      if (updates.status === 'resolved' && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date().toISOString();
      }
      if (updates.status === 'closed' && !ticket.closedAt) {
        ticket.closedAt = new Date().toISOString();
      }

      await redis.hset(`support:ticket:${ticketId}`, ticket);
      this.tickets.set(ticketId, ticket);
      
      this.emit('ticket:updated', ticket);
      return ticket;
    } catch (error) {
      console.error("Failed to update ticket:", error.message);
      throw error;
    }
  }

  /**
   * Thêm comment vào ticket
   */
  async addComment(ticketId, commentData) {
    try {
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId: ticketId,
        userId: commentData.userId,
        userType: commentData.userType || 'customer', // customer, agent, system
        content: commentData.content,
        isInternal: commentData.isInternal || false,
        attachments: commentData.attachments || [],
        createdAt: new Date().toISOString(),
        metadata: commentData.metadata || {}
      };

      await redis.lpush(`support:ticket:${ticketId}:comments`, JSON.stringify(comment));
      
      // Update ticket's updatedAt
      await this.updateTicket(ticketId, { updatedAt: new Date().toISOString() });
      
      this.emit('ticket:comment:added', { ticketId, comment });
      return comment;
    } catch (error) {
      console.error("Failed to add comment:", error.message);
      throw error;
    }
  }

  /**
   * Lấy comments của ticket
   */
  async getTicketComments(ticketId, limit = 50) {
    try {
      const comments = await redis.lrange(`support:ticket:${ticketId}:comments`, 0, limit - 1);
      return comments.map(comment => JSON.parse(comment)).reverse();
    } catch (error) {
      console.error("Failed to get ticket comments:", error.message);
      return [];
    }
  }

  /**
   * Assign ticket to agent
   */
  async assignTicket(ticketId, agentId) {
    try {
      const ticket = await this.updateTicket(ticketId, {
        assignedAgent: agentId,
        status: 'in_progress'
      });

      // Add to agent's assigned tickets
      await redis.lpush(`agent:${agentId}:tickets`, ticketId);
      
      this.emit('ticket:assigned', { ticketId, agentId, ticket });
      return ticket;
    } catch (error) {
      console.error("Failed to assign ticket:", error.message);
      throw error;
    }
  }

  /**
   * Lấy ticket by ID
   */
  async getTicket(ticketId) {
    try {
      const ticket = await redis.hgetall(`support:ticket:${ticketId}`);
      return ticket && ticket.id ? ticket : null;
    } catch (error) {
      console.error("Failed to get ticket:", error.message);
      return null;
    }
  }

  /**
   * Lấy tickets của user
   */
  async getUserTickets(userId, limit = 50) {
    try {
      const ticketIds = await redis.lrange(`user:${userId}:tickets`, 0, limit - 1);
      const tickets = [];

      for (const ticketId of ticketIds) {
        const ticket = await this.getTicket(ticketId);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error("Failed to get user tickets:", error.message);
      return [];
    }
  }

  /**
   * Lấy tickets của agent
   */
  async getAgentTickets(agentId, limit = 50) {
    try {
      const ticketIds = await redis.lrange(`agent:${agentId}:tickets`, 0, limit - 1);
      const tickets = [];

      for (const ticketId of ticketIds) {
        const ticket = await this.getTicket(ticketId);
        if (ticket) {
          tickets.push(ticket);
        }
      }

      return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error("Failed to get agent tickets:", error.message);
      return [];
    }
  }

  /**
   * Lấy tất cả tickets với filters
   */
  async getAllTickets(filters = {}) {
    try {
      const ticketKeys = await redis.keys(`support:ticket:*`);
      const tickets = [];

      for (const key of ticketKeys) {
        const ticket = await redis.hgetall(key);
        if (ticket && ticket.id) {
          // Apply filters
          if (filters.status && ticket.status !== filters.status) continue;
          if (filters.priority && ticket.priority !== filters.priority) continue;
          if (filters.category && ticket.category !== filters.category) continue;
          if (filters.assignedAgent && ticket.assignedAgent !== filters.assignedAgent) continue;
          
          tickets.push(ticket);
        }
      }

      return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error("Failed to get all tickets:", error.message);
      return [];
    }
  }

  /**
   * Tạo knowledge base article
   */
  async createKnowledgeBaseArticle(articleData) {
    try {
      const article = {
        id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: articleData.title,
        content: articleData.content,
        category: articleData.category,
        tags: articleData.tags || [],
        status: articleData.status || 'published', // draft, published, archived
        authorId: articleData.authorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        helpful: 0,
        notHelpful: 0,
        metadata: articleData.metadata || {}
      };

      await redis.hset(`knowledge:article:${article.id}`, article);
      
      // Add to category index
      await redis.lpush(`knowledge:category:${article.category}`, article.id);
      
      this.emit('knowledge:article:created', article);
      return article;
    } catch (error) {
      console.error("Failed to create knowledge base article:", error.message);
      throw error;
    }
  }

  /**
   * Lấy knowledge base articles
   */
  async getKnowledgeBaseArticles(category = null, limit = 50) {
    try {
      let articleIds = [];
      
      if (category) {
        articleIds = await redis.lrange(`knowledge:category:${category}`, 0, limit - 1);
      } else {
        const articleKeys = await redis.keys(`knowledge:article:*`);
        articleIds = articleKeys.map(key => key.split(':')[2]);
      }

      const articles = [];
      for (const articleId of articleIds) {
        const article = await redis.hgetall(`knowledge:article:${articleId}`);
        if (article && article.id) {
          articles.push(article);
        }
      }

      return articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error("Failed to get knowledge base articles:", error.message);
      return [];
    }
  }

  /**
   * Tạo FAQ
   */
  async createFAQ(faqData) {
    try {
      const faq = {
        id: `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
        tags: faqData.tags || [],
        status: faqData.status || 'published',
        order: faqData.order || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        helpful: 0,
        notHelpful: 0
      };

      await redis.hset(`faq:${faq.id}`, faq);
      
      // Add to category index
      await redis.lpush(`faq:category:${faq.category}`, faq.id);
      
      this.emit('faq:created', faq);
      return faq;
    } catch (error) {
      console.error("Failed to create FAQ:", error.message);
      throw error;
    }
  }

  /**
   * Lấy FAQs
   */
  async getFAQs(category = null, limit = 50) {
    try {
      let faqIds = [];
      
      if (category) {
        faqIds = await redis.lrange(`faq:category:${category}`, 0, limit - 1);
      } else {
        const faqKeys = await redis.keys(`faq:*`);
        faqIds = faqKeys.map(key => key.split(':')[1]);
      }

      const faqs = [];
      for (const faqId of faqIds) {
        const faq = await redis.hgetall(`faq:${faqId}`);
        if (faq && faq.id) {
          faqs.push(faq);
        }
      }

      return faqs.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error("Failed to get FAQs:", error.message);
      return [];
    }
  }

  /**
   * Lấy support statistics
   */
  async getSupportStats() {
    try {
      const stats = {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        averageResolutionTime: 0,
        ticketsByCategory: {},
        ticketsByPriority: {},
        responseTimeStats: {}
      };

      const ticketKeys = await redis.keys(`support:ticket:*`);
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      for (const key of ticketKeys) {
        const ticket = await redis.hgetall(key);
        if (ticket && ticket.id) {
          stats.totalTickets++;
          
          // Status stats
          switch (ticket.status) {
            case 'open':
              stats.openTickets++;
              break;
            case 'in_progress':
              stats.inProgressTickets++;
              break;
            case 'resolved':
              stats.resolvedTickets++;
              break;
            case 'closed':
              stats.closedTickets++;
              break;
          }

          // Category stats
          if (!stats.ticketsByCategory[ticket.category]) {
            stats.ticketsByCategory[ticket.category] = 0;
          }
          stats.ticketsByCategory[ticket.category]++;

          // Priority stats
          if (!stats.ticketsByPriority[ticket.priority]) {
            stats.ticketsByPriority[ticket.priority] = 0;
          }
          stats.ticketsByPriority[ticket.priority]++;

          // Resolution time stats
          if (ticket.resolvedAt) {
            const created = new Date(ticket.createdAt);
            const resolved = new Date(ticket.resolvedAt);
            const resolutionTime = resolved - created;
            totalResolutionTime += resolutionTime;
            resolvedCount++;
          }
        }
      }

      if (resolvedCount > 0) {
        stats.averageResolutionTime = totalResolutionTime / resolvedCount;
      }

      return stats;
    } catch (error) {
      console.error("Failed to get support stats:", error.message);
      return {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        averageResolutionTime: 0,
        ticketsByCategory: {},
        ticketsByPriority: {},
        responseTimeStats: {}
      };
    }
  }

  /**
   * Lấy tất cả categories
   */
  getCategories() {
    return Array.from(this.categories.values());
  }

  /**
   * Lấy tất cả priorities
   */
  getPriorities() {
    return Array.from(this.priorities.values());
  }

  /**
   * Lấy tất cả statuses
   */
  getStatuses() {
    return Object.entries(this.statuses).map(([key, value]) => ({
      id: key,
      ...value
    }));
  }

  /**
   * Tạo category mới
   */
  async createCategory(categoryData) {
    try {
      const category = {
        id: categoryData.id,
        name: categoryData.name,
        description: categoryData.description,
        color: categoryData.color || '#6b7280',
        icon: categoryData.icon || '📁',
        createdAt: new Date().toISOString()
      };

      this.categories.set(category.id, category);
      await redis.hset(`support:category:${category.id}`, category);
      
      this.emit('category:created', category);
      return category;
    } catch (error) {
      console.error("Failed to create category:", error.message);
      throw error;
    }
  }

  /**
   * Tạo priority mới
   */
  async createPriority(priorityData) {
    try {
      const priority = {
        id: priorityData.id,
        name: priorityData.name,
        description: priorityData.description,
        color: priorityData.color || '#6b7280',
        responseTime: priorityData.responseTime || 24,
        createdAt: new Date().toISOString()
      };

      this.priorities.set(priority.id, priority);
      await redis.hset(`support:priority:${priority.id}`, priority);
      
      this.emit('priority:created', priority);
      return priority;
    } catch (error) {
      console.error("Failed to create priority:", error.message);
      throw error;
    }
  }
}

export const customerSupportService = new CustomerSupportService();
