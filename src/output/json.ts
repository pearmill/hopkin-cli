export interface JSONOptions {
  fields?: string[];
  pretty?: boolean;
}

function filterFields(
  data: Record<string, unknown>[],
  fields: string[],
): Record<string, unknown>[] {
  return data.map((row) => {
    const filtered: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in row) {
        filtered[field] = row[field];
      }
    }
    return filtered;
  });
}

export function renderJSON(data: unknown, options?: JSONOptions): string {
  let output = data;

  if (options?.fields && Array.isArray(data)) {
    output = filterFields(
      data as Record<string, unknown>[],
      options.fields,
    );
  }

  if (options?.pretty) {
    return JSON.stringify(output, null, 2);
  }

  return JSON.stringify(output);
}
