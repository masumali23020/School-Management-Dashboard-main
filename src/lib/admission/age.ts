export type AgeParts = {
  years: number;
  months: number;
  days: number;
  label: string;
};

export function calculateAgeFromDOB(
  dateOfBirth: Date | string,
  referenceDate: Date = new Date()
): AgeParts {
  const dob = new Date(dateOfBirth);
  const ref = new Date(referenceDate);

  if (Number.isNaN(dob.getTime())) {
    return { years: 0, months: 0, days: 0, label: "—" };
  }

  let years = ref.getFullYear() - dob.getFullYear();
  let months = ref.getMonth() - dob.getMonth();
  let days = ref.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(ref.getFullYear(), ref.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const label = `${years} Years ${months} Months ${days} Days`;
  return { years, months, days, label };
}

export function formatDateEnGB(date: Date | string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
