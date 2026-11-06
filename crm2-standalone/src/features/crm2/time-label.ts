/** Короткая понятная подпись срока: «вчера, 14:00», «завтра, 09:30»… */
export function contactTimeLabel(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const day = 86_400_000;
  if (date.toDateString() === today.toDateString()) return `сегодня, ${time}`;
  if (date.toDateString() === new Date(today.getTime() - day).toDateString())
    return `вчера, ${time}`;
  if (date.toDateString() === new Date(today.getTime() + day).toDateString())
    return `завтра, ${time}`;
  return `${date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}, ${time}`;
}
