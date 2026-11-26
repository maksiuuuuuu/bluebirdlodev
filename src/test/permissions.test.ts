import { describe, expect, it } from "vitest";
import { randomDrivingLicense } from "@/lib/permissions";

describe("Losowanie prawa jazdy", () => {
  it("przyznaje prawo jazdy dla wyniku losowania poniżej 50%", () => {
    expect(randomDrivingLicense(() => 0.49)).toBe(true);
  });

  it("nie przyznaje prawa jazdy dla wyniku losowania od 50%", () => {
    expect(randomDrivingLicense(() => 0.5)).toBe(false);
  });

  it("wykonuje nowe losowanie przy każdym wywołaniu", () => {
    const results = [0.1, 0.9];
    let call = 0;
    const random = () => results[call++] ?? 0.9;

    expect(randomDrivingLicense(random)).toBe(true);
    expect(randomDrivingLicense(random)).toBe(false);
  });
});
