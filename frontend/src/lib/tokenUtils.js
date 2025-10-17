// Token utilities để quản lý JWT token
export function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, "=");
    const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    const decoded = JSON.parse(decodeURIComponent(escape(json)));
    
    // Kiểm tra thời gian hết hạn
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.log("Token đã hết hạn");
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error("Lỗi decode JWT:", error);
    return null;
  }
}

export function isTokenExpiringSoon(token, minutesBeforeExpiry = 30) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  
  const expiryTime = payload.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiry = expiryTime - currentTime;
  const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);
  
  return minutesUntilExpiry <= minutesBeforeExpiry;
}

export function getTokenExpiryTime(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return null;
  
  return new Date(payload.exp * 1000);
}

export function formatTimeUntilExpiry(token) {
  const expiryTime = getTokenExpiryTime(token);
  if (!expiryTime) return "Unknown";
  
  const now = new Date();
  const diffMs = expiryTime - now;
  
  if (diffMs <= 0) return "Expired";
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
