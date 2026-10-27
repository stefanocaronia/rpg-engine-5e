// The checks every game system passes (SYS-2, SYS-5, SYS-8, D-172, D-267), as the engine's test kit makes them on this repository: pages that read like a
// campaign's, each name once, no bases it lacks, every field declared and of its kind, rules in chapters, the pictures its pages link, and where it comes from.
import { systemChecks } from "rpg-engine/testing";
import { describe, expect, it } from "vitest";
import { repository } from "./support.ts";

describe("the installed game systems", () => {
    describe("the system 5e", () => {
        const checks = systemChecks(repository);

        it("reads like a campaign: every page reads, and validate finds no problem in it", () => {
            expect(checks.name).toBe("5e");
            expect(checks.pages).toBeGreaterThan(0);
            expect(checks.unread).toEqual([]);
        });

        it("names each page once among all its types, with a straight apostrophe (SYS-2, SYS-5)", () => {
            expect(checks.names).toEqual([]);
        });

        it("writes in quotes a value that YAML would read as a number, such as the +2 of a shield", () => {
            expect(checks.unquoted).toEqual([]);
        });

        it("derives a page only from another of its own that exists, as a subrace from its race (SYS-2, D-201)", () => {
            expect(checks.bases).toEqual([]);
        });

        it("gives data the engine can read: coins, declared fields, and rules that its chapters hold (DAT-1–DAT-7)", () => {
            expect(checks.declarations).toEqual([]);
        });

        it("writes its rules in chapters that open with a heading, each section read by its path (RUL-1, RUL-3)", () => {
            expect(checks.chapters).toBeGreaterThan(0);
            expect(checks.rules).toEqual([]);
        });

        it("gives every declared field a value of its kind, without a final period (SYS-8)", () => {
            expect(checks.values).toEqual([]);
        });

        it("declares the kind of every field its pages hold (SYS-8)", () => {
            expect(checks.undeclared).toEqual([]);
        });

        it("has in its images folder every picture its pages link, and only those (D-267)", () => {
            expect(checks.pictures).toEqual([]);
        });

        it("says where it comes from", () => {
            expect(checks.attribution).toMatch(/^This work includes material taken from the System Reference Document 5\.1/);
        });
    });
});
