/**
 * Проверка ИНН на клиенте — та же схема ФНС, что и на сервере
 * (`backend/app/schemas/validators.py`): 10 или 12 цифр с контрольной суммой.
 * Так карточка не «сохранит» вымышленный заведомо неверный ИНН и покажет
 * ошибку сразу, а не после подключения API.
 */
export function innChecksumOk(inn: string): boolean {
  const weighted = (weights: number[]): number =>
    (weights.reduce((acc, weight, i) => acc + weight * Number(inn[i]), 0) % 11) % 10;

  if (inn.length === 10) {
    return weighted([2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(inn[9]);
  }
  if (inn.length === 12) {
    return (
      weighted([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(inn[10]) &&
      weighted([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === Number(inn[11])
    );
  }
  return false;
}

/** Текст ошибки или null: пустое значение не считаем ошибкой, пока поле не
 *  начали править (обязательность ИНН проверяет форма). */
export function innProblem(inn: string): string | null {
  const digits = inn.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 12) {
    return "ИНН должен содержать 10 или 12 цифр";
  }
  if (!innChecksumOk(digits)) {
    return "Некорректный ИНН: не сходится контрольная сумма";
  }
  return null;
}
