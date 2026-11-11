export function parseNumeric(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function round1(value: any): number | undefined {
  return typeof value === 'number' ? Math.round(value * 10) / 10 : undefined;
}

export function round2(value: any): number | undefined {
  return typeof value === 'number' ? Math.round(value * 100) / 100 : undefined;
}

export function getAssessmentScore(value: any, type: string): number | undefined {
  if (Array.isArray(value?.assessments)) {
    const assessment = value.assessments.find((a: any) => a.type === type);
    return parseNumeric(assessment?.score);
  }
  return undefined;
}

export function computeMotEot(value: any): number | undefined {
  if (typeof value?.motEot === 'number') return value.motEot;
  if (typeof value?.motEot === 'string') {
    const parsed = parseNumeric(value.motEot);
    if (typeof parsed === 'number') return parsed;
  }
  const mot = getAssessmentScore(value, 'MIDTERM') ?? parseNumeric(value?.mot);
  const eot = getAssessmentScore(value, 'END_OF_TERM') ?? parseNumeric(value?.eot);
  if (typeof mot === 'number' && typeof eot === 'number') {
    return Math.round(((mot + eot) / 2) * 10) / 10;
  }
  return mot ?? eot;
}
