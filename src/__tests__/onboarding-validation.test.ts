import { describe, it, expect } from "vitest";
import { z } from "zod";

// Reproduce the age validation schema from Onboarding.tsx
const ageSchema = z
  .string()
  .min(1, { message: "Vârsta este obligatorie" })
  .refine((val) => /^\d+$/.test(val), { message: "Vârsta trebuie să fie un număr întreg (fără zecimale)" })
  .refine((val) => {
    const num = parseInt(val, 10);
    return num >= 1 && num <= 120;
  }, { message: "Vârsta trebuie să fie între 1 și 120 de ani" });

function validateAge(age: string): string | null {
  try {
    ageSchema.parse(age);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0].message;
    }
    return "Vârstă invalidă";
  }
}

// Reproduce canProceed logic
function canProceed(step: number, formData: {
  firstName: string; lastName: string; age: string;
  religion: string; city: string; parish: string;
}): boolean {
  switch (step) {
    case 1: {
      const ageErr = formData.age ? validateAge(formData.age) : "Vârsta este obligatorie";
      return !!(formData.firstName.trim() && formData.lastName.trim() && formData.age && !ageErr);
    }
    case 2:
      return !!(formData.religion.trim() && formData.city.trim() && formData.parish.trim());
    case 3:
      return true;
    case 4:
      return true;
    default:
      return false;
  }
}

describe("Age Validation", () => {
  it("accepts valid ages", () => {
    expect(validateAge("1")).toBeNull();
    expect(validateAge("25")).toBeNull();
    expect(validateAge("120")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(validateAge("")).toBe("Vârsta este obligatorie");
  });

  it("rejects decimal numbers", () => {
    expect(validateAge("25.5")).toBe("Vârsta trebuie să fie un număr întreg (fără zecimale)");
  });

  it("rejects non-numeric input", () => {
    expect(validateAge("abc")).toBe("Vârsta trebuie să fie un număr întreg (fără zecimale)");
    expect(validateAge("12a")).toBe("Vârsta trebuie să fie un număr întreg (fără zecimale)");
  });

  it("rejects age 0", () => {
    expect(validateAge("0")).toBe("Vârsta trebuie să fie între 1 și 120 de ani");
  });

  it("rejects age over 120", () => {
    expect(validateAge("121")).toBe("Vârsta trebuie să fie între 1 și 120 de ani");
    expect(validateAge("999")).toBe("Vârsta trebuie să fie între 1 și 120 de ani");
  });

  it("rejects negative numbers (as non-numeric due to minus sign)", () => {
    expect(validateAge("-5")).toBe("Vârsta trebuie să fie un număr întreg (fără zecimale)");
  });
});

describe("canProceed - Step 1 (Personal Info)", () => {
  const base = { religion: "Ortodox", city: "București", parish: "Sf. Gheorghe" };

  it("returns true when all required fields are filled with valid data", () => {
    expect(canProceed(1, { ...base, firstName: "Ion", lastName: "Popescu", age: "30" })).toBe(true);
  });

  it("returns false when firstName is empty", () => {
    expect(canProceed(1, { ...base, firstName: "", lastName: "Popescu", age: "30" })).toBe(false);
  });

  it("returns false when firstName is whitespace only", () => {
    expect(canProceed(1, { ...base, firstName: "   ", lastName: "Popescu", age: "30" })).toBe(false);
  });

  it("returns false when lastName is empty", () => {
    expect(canProceed(1, { ...base, firstName: "Ion", lastName: "", age: "30" })).toBe(false);
  });

  it("returns false when age is empty", () => {
    expect(canProceed(1, { ...base, firstName: "Ion", lastName: "Popescu", age: "" })).toBe(false);
  });

  it("returns false when age is invalid", () => {
    expect(canProceed(1, { ...base, firstName: "Ion", lastName: "Popescu", age: "0" })).toBe(false);
    expect(canProceed(1, { ...base, firstName: "Ion", lastName: "Popescu", age: "200" })).toBe(false);
  });
});

describe("canProceed - Step 2 (Location Info)", () => {
  const base = { firstName: "Ion", lastName: "Popescu", age: "30" };

  it("returns true when all step 2 fields are filled", () => {
    expect(canProceed(2, { ...base, religion: "Ortodox", city: "Cluj", parish: "Sf. Maria" })).toBe(true);
  });

  it("returns false when religion is whitespace only", () => {
    expect(canProceed(2, { ...base, religion: "  ", city: "Cluj", parish: "Sf. Maria" })).toBe(false);
  });

  it("returns false when city is empty", () => {
    expect(canProceed(2, { ...base, religion: "Ortodox", city: "", parish: "Sf. Maria" })).toBe(false);
  });

  it("returns false when parish is empty", () => {
    expect(canProceed(2, { ...base, religion: "Ortodox", city: "Cluj", parish: "" })).toBe(false);
  });
});

describe("canProceed - Steps 3 & 4 (Optional)", () => {
  const base = { firstName: "Ion", lastName: "Popescu", age: "30", religion: "Ortodox", city: "Cluj", parish: "Sf. Maria" };

  it("step 3 (photo) always returns true", () => {
    expect(canProceed(3, base)).toBe(true);
  });

  it("step 4 (bio) always returns true", () => {
    expect(canProceed(4, base)).toBe(true);
  });
});
