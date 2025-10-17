export function formatCurrency(value) {
  if (typeof value !== "number") value = Number(value) || 0;
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

