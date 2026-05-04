export function monthStart(month) {
  return `${month}-01`;
}

export function monthEnd(month) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(y, m, 0);
  return `${month}-${String(date.getDate()).padStart(2, "0")}`;
}

export function compareMonths(a, b) {
  return a.localeCompare(b);
}

export function addMonths(month, offset) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
