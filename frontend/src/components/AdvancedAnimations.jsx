import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion';

/**
 * Advanced Animation Components
 */

// Fade In Animation
export const FadeIn = ({ children, delay = 0, duration = 0.5, direction = 'up' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 20 : direction === 'down' ? -20 : 0,
      x: direction === 'left' ? 20 : direction === 'right' ? -20 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration,
        delay,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
};

// Stagger Animation for Lists
export const StaggerContainer = ({ children, staggerDelay = 0.1 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Hover Animation
export const HoverScale = ({ children, scale = 1.05, duration = 0.2 }) => {
  return (
    <motion.div
      whileHover={{ scale, transition: { duration } }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
};

// Loading Spinner with Animation
export const AnimatedSpinner = ({ size = 40, color = '#3b82f6' }) => {
  return (
    <motion.div
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <motion.div
        className="border-4 border-gray-200 border-t-blue-500 rounded-full"
        style={{ width: size, height: size, borderTopColor: color }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
};

// Progress Bar with Animation
export const AnimatedProgressBar = ({ progress, duration = 1, color = '#3b82f6' }) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${displayProgress}%` }}
        transition={{ duration, ease: 'easeOut' }}
      />
    </div>
  );
};

// Floating Animation
export const Floating = ({ children, intensity = 10, duration = 2 }) => {
  return (
    <motion.div
      animate={{
        y: [0, -intensity, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      {children}
    </motion.div>
  );
};

// Pulse Animation
export const Pulse = ({ children, scale = 1.1, duration = 1 }) => {
  return (
    <motion.div
      animate={{
        scale: [1, scale, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    >
      {children}
    </motion.div>
  );
};

// Slide In Animation
export const SlideIn = ({ children, direction = 'left', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const variants = {
    hidden: {
      x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
      y: direction === 'up' ? -100 : direction === 'down' ? 100 : 0,
      opacity: 0
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        delay,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
};

// Typewriter Effect
export const Typewriter = ({ text, speed = 50, delay = 0 }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex(0);
      setDisplayText('');
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="ml-1"
      >
        |
      </motion.span>
    </motion.span>
  );
};

// Morphing Button
export const MorphingButton = ({ 
  children, 
  morphTo, 
  duration = 0.3,
  className = '',
  onClick 
}) => {
  const [isMorphed, setIsMorphed] = useState(false);

  const handleClick = () => {
    setIsMorphed(!isMorphed);
    if (onClick) onClick();
  };

  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          opacity: isMorphed ? 0 : 1,
          scale: isMorphed ? 0.8 : 1
        }}
        transition={{ duration }}
      >
        {children}
      </motion.div>
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{
          opacity: isMorphed ? 1 : 0,
          scale: isMorphed ? 1 : 0.8
        }}
        transition={{ duration }}
      >
        {morphTo}
      </motion.div>
    </motion.button>
  );
};

// Parallax Scroll Effect
export const ParallaxScroll = ({ children, speed = 0.5 }) => {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * -speed;
        setOffset(rate);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} style={{ transform: `translateY(${offset}px)` }}>
      {children}
    </div>
  );
};

// Reveal Animation
export const Reveal = ({ children, direction = 'up', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 50 : direction === 'down' ? -50 : 0,
      x: direction === 'left' ? 50 : direction === 'right' ? -50 : 0,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay,
        ease: 'easeOut'
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  );
};

// Magnetic Button Effect
export const MagneticButton = ({ children, strength = 0.3, className = '' }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * strength;
      const y = (e.clientY - rect.top - rect.height / 2) * strength;
      setPosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
};

// Glitch Effect
export const GlitchText = ({ children, intensity = 0.1 }) => {
  const [glitch, setGlitch] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch({
        x: (Math.random() - 0.5) * intensity * 10,
        y: (Math.random() - 0.5) * intensity * 10
      });
    }, 100);

    return () => clearInterval(interval);
  }, [intensity]);

  return (
    <motion.span
      animate={{ x: glitch.x, y: glitch.y }}
      transition={{ duration: 0.1 }}
      style={{
        textShadow: `
          ${glitch.x}px 0 0 #ff0000,
          ${-glitch.x}px 0 0 #00ff00,
          0 ${glitch.y}px 0 #0000ff
        `
      }}
    >
      {children}
    </motion.span>
  );
};

// Particle System
export const ParticleSystem = ({ count = 50, color = '#3b82f6' }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    speed: Math.random() * 2 + 0.5
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full opacity-30"
          style={{
            backgroundColor: color,
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3]
          }}
          transition={{
            duration: particle.speed,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 2
          }}
        />
      ))}
    </div>
  );
};

// Loading Skeleton
export const LoadingSkeleton = ({ width = '100%', height = '20px', className = '' }) => {
  return (
    <motion.div
      className={`bg-gray-200 rounded ${className}`}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
    />
  );
};

// Tilt Effect
export const TiltCard = ({ children, intensity = 20, className = '' }) => {
  const ref = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateX = (e.clientY - centerY) / 10;
      const rotateY = (centerX - e.clientX) / 10;
      setRotate({ x: rotateX, y: rotateY });
    }
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: rotate.x,
        rotateY: rotate.y
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
};

export default {
  FadeIn,
  StaggerContainer,
  HoverScale,
  AnimatedSpinner,
  AnimatedProgressBar,
  Floating,
  Pulse,
  SlideIn,
  Typewriter,
  MorphingButton,
  ParallaxScroll,
  Reveal,
  MagneticButton,
  GlitchText,
  ParticleSystem,
  LoadingSkeleton,
  TiltCard
};
