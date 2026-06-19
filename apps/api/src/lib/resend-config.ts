export function isResendEnabled(resendApiKey: string | undefined): boolean {
  const key = resendApiKey?.trim();
  if (!key) return false;
  if (/x{3,}/i.test(key) || key === "re_test") return false;
  return true;
}
