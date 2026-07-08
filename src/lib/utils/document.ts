export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeDocument(value: string) {
  return onlyDigits(value);
}

export function formatCpfDocument(value: string | null | undefined) {
  const digits = onlyDigits(value ?? "").slice(0, 11);

  if (!digits) {
    return "";
  }

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatCnpjDocument(value: string | null | undefined) {
  const digits = onlyDigits(value ?? "").slice(0, 14);

  if (!digits) {
    return "";
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCep(value: string | null | undefined) {
  const digits = onlyDigits(value ?? "").slice(0, 8);

  if (!digits) {
    return "";
  }

  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatTelefone(value: string | null | undefined) {
  const digits = onlyDigits(value ?? "").slice(0, 11);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `(${digits}`;
  }

  if (digits.length <= 10) {
    const ddd = digits.slice(0, 2);
    const prefix = digits.slice(2, 6);
    const suffix = digits.slice(6, 10);
    return suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`;
  }

  const ddd = digits.slice(0, 2);
  const ninthDigit = digits.slice(2, 3);
  const prefix = digits.slice(3, 7);
  const suffix = digits.slice(7, 11);

  return suffix
    ? `(${ddd}) ${ninthDigit} ${prefix}-${suffix}`
    : `(${ddd}) ${ninthDigit} ${prefix}`;
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let digit = (sum * 10) % 11;
  if (digit === 10) {
    digit = 0;
  }

  if (digit !== Number(cpf[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(cpf[index]) * (11 - index);
  }

  digit = (sum * 10) % 11;
  if (digit === 10) {
    digit = 0;
  }

  return digit === Number(cpf[10]);
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calc = (base: string, factors: number[]) => {
    const sum = factors.reduce((acc, factor, index) => acc + Number(base[index]) * factor, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calc(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calc(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return firstDigit === Number(cnpj[12]) && secondDigit === Number(cnpj[13]);
}
