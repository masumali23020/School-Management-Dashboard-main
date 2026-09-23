export function getAdmissionBasePath(schoolSlug: string, useSchoolPrefix = false) {
  return useSchoolPrefix ? `/school/${schoolSlug}` : `/${schoolSlug}`;
}

export function getSchoolHomePath(schoolSlug: string) {
  return `/${schoolSlug}`;
}
