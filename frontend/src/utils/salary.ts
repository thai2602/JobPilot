const VND_PER_MILLION = 1_000_000;

const toMillions = (value: number): number =>
  Math.abs(value) >= 100_000 ? value / VND_PER_MILLION : value;

const formatMillionValue = (value: number): string =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(toMillions(value));

export function formatSalaryRange(
  minimum?: number | null,
  maximum?: number | null,
): string {
  const hasMinimum = typeof minimum === "number" && Number.isFinite(minimum) && minimum > 0;
  const hasMaximum = typeof maximum === "number" && Number.isFinite(maximum) && maximum > 0;

  if (hasMinimum && hasMaximum) {
    if (minimum === maximum) return `${formatMillionValue(minimum)} triệu`;
    return `${formatMillionValue(minimum)}–${formatMillionValue(maximum)} triệu`;
  }
  if (hasMinimum) return `Từ ${formatMillionValue(minimum)} triệu`;
  if (hasMaximum) return `Đến ${formatMillionValue(maximum)} triệu`;
  return "Thỏa thuận";
}
