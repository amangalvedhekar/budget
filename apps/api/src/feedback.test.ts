import {
  labelForCategory,
  textToAdf,
  validateShareExperienceInput,
} from "./feedback";

describe("feedback", () => {
  it("maps categories to controlled Jira labels", () => {
    expect(labelForCategory("APP_ISSUE")).toBe("feedback-bug");
    expect(labelForCategory("IMPROVEMENT")).toBe("feedback-improvement");
    expect(labelForCategory("NEW_FEATURE")).toBe("feedback-feature");
    expect(labelForCategory("MISCELLANEOUS")).toBe("feedback-other");
  });

  it("trims and validates feedback", () => {
    expect(
      validateShareExperienceInput({
        category: "APP_ISSUE",
        title: "  Broken chart  ",
        details: "  The chart does not load.  ",
      })
    ).toEqual({
      category: "APP_ISSUE",
      title: "Broken chart",
      details: "The chart does not load.",
    });
  });

  it("rejects short feedback", () => {
    expect(() =>
      validateShareExperienceInput({
        category: "IMPROVEMENT",
        title: "No",
        details: "Too short",
      })
    ).toThrow("Title must be between 3 and 150 characters.");
  });

  it("converts multiple lines to ADF paragraphs", () => {
    expect(textToAdf("First line\nSecond line").content).toHaveLength(2);
  });
});
