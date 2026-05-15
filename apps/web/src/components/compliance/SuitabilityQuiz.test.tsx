import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SuitabilityQuiz } from "./SuitabilityQuiz";

describe("SuitabilityQuiz", () => {
  beforeEach(() => {
    // Clear console.log mock before each test
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders all quiz questions", () => {
    render(<SuitabilityQuiz />);

    // Check for main heading
    expect(
      screen.getByText(/Restricted Investor Suitability Quiz/i),
    ).toBeInTheDocument();

    // Check for all 5 questions
    expect(
      screen.getByText(/What is your primary investment goal\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/How would you describe your investment experience\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What is your risk tolerance\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What is your investment time horizon\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /How would you react if your investment dropped 20% in a month\?/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows submit button", () => {
    render(<SuitabilityQuiz />);
    expect(
      screen.getByRole("button", { name: /Submit Certification/i }),
    ).toBeInTheDocument();
  });

  it("alerts user when submitting without answering all questions", () => {
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
    render(<SuitabilityQuiz />);

    const submitButton = screen.getByRole("button", {
      name: /Submit Certification/i,
    });
    fireEvent.click(submitButton);

    expect(alertMock).toHaveBeenCalledWith(
      "Please answer all questions before submitting.",
    );
    alertMock.mockRestore();
  });

  it("successfully submits when all questions are answered", async () => {
    const handleSubmit = jest.fn();
    render(<SuitabilityQuiz onSubmit={handleSubmit} />);

    const radioButtons = screen.getAllByRole("radio");
    radioButtons.forEach((radio) => fireEvent.click(radio));

    const submitButton = screen.getByRole("button", {
      name: /Submit Certification/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        "Quiz Answers:",
        expect.objectContaining({
          answers: expect.any(Object),
          summary: expect.any(Object),
        }),
      );
    });

    expect(
      screen.getByText(/Certification Submitted Successfully/i),
    ).toBeInTheDocument();
  });

  it("calls onSubmit callback when provided", () => {
    const mockOnSubmit = jest.fn();
    render(<SuitabilityQuiz onSubmit={mockOnSubmit} />);

    // Answer all questions
    const radioButtons = screen.getAllByRole("radio");
    radioButtons.forEach((radio) => fireEvent.click(radio));

    const submitButton = screen.getByRole("button", {
      name: /Submit Certification/i,
    });
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith(expect.any(Object));
  });

  it("allows starting over after submission", () => {
    render(<SuitabilityQuiz />);

    // Answer and submit
    const radioButtons = screen.getAllByRole("radio");
    radioButtons.forEach((radio) => fireEvent.click(radio));

    const submitButton = screen.getByRole("button", {
      name: /Submit Certification/i,
    });
    fireEvent.click(submitButton);

    // Check success screen appears
    expect(screen.getByText(/Start Over/i)).toBeInTheDocument();

    const startOverButton = screen.getByRole("button", {
      name: /Start quiz over/i,
    });
    fireEvent.click(startOverButton);

    expect(
      screen.getByText(/Restricted Investor Suitability Quiz/i),
    ).toBeInTheDocument();
  });

  it("has proper ARIA labels for accessibility", () => {
    render(<SuitabilityQuiz />);

    expect(screen.getByRole("form")).toHaveAttribute(
      "aria-label",
      "Investment suitability quiz",
    );

    const radioGroups = screen.getAllByRole("radiogroup");
    expect(radioGroups.length).toBe(5);
    expect(radioGroups[0]).toHaveAttribute("aria-label", "Question 1");
  });
});
