export function randomDrivingLicense(random: () => number = Math.random): boolean {
  return random() < 0.5;
}
