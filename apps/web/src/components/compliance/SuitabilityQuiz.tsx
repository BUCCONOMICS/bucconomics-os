"use client";

import React, { useState } from "react";

interface Question {
  id: number;
  text: string;
  options: {
    value: string;
    label: string;
    riskLevel: number;
  }[];
}

export interface Answers {
  [key: number]: {
    value: string;
    riskLevel: number;
  };
}

interface SuitabilityQuizProps {
  onSubmit?: (answers: Answers) => void;
}

const questions: Question[] = [
  {
    id: 1,
    text: "What is your primary investment goal?",
    options: [
      {
        value: "preservation",
        label: "Capital preservation (lowest risk)",
        riskLevel: 1,
      },
      { value: "income", label: "Steady income (low risk)", riskLevel: 2 },
      {
        value: "balanced",
        label: "Balanced growth (moderate risk)",
        riskLevel: 3,
      },
      { value: "growth", label: "Maximum growth (high risk)", riskLevel: 4 },
    ],
  },
  {
    id: 2,
    text: "How would you describe your investment experience?",
    options: [
      { value: "none", label: "No experience", riskLevel: 1 },
      { value: "limited", label: "Limited (1-2 years)", riskLevel: 2 },
      { value: "moderate", label: "Moderate (3-5 years)", riskLevel: 3 },
      { value: "extensive", label: "Extensive (5+ years)", riskLevel: 4 },
    ],
  },
  {
    id: 3,
    text: "What is your risk tolerance?",
    options: [
      {
        value: "very_low",
        label: "Very low - I can't accept losses",
        riskLevel: 1,
      },
      {
        value: "low",
        label: "Low - Willing to accept small losses",
        riskLevel: 2,
      },
      {
        value: "medium",
        label: "Medium - Accept moderate losses for gains",
        riskLevel: 3,
      },
      {
        value: "high",
        label: "High - Comfortable with significant volatility",
        riskLevel: 4,
      },
    ],
  },
  {
    id: 4,
    text: "What is your investment time horizon?",
    options: [
      { value: "short", label: "Short-term (< 1 year)", riskLevel: 1 },
      { value: "medium", label: "Medium-term (1-3 years)", riskLevel: 2 },
      { value: "long", label: "Long-term (3-5 years)", riskLevel: 3 },
      { value: "very_long", label: "Very long-term (5+ years)", riskLevel: 4 },
    ],
  },
  {
    id: 5,
    text: "How would you react if your investment dropped 20% in a month?",
    options: [
      { value: "panic", label: "Panic and sell immediately", riskLevel: 1 },
      { value: "anxious", label: "Anxious but hold", riskLevel: 2 },
      { value: "wait", label: "Wait and see", riskLevel: 3 },
      { value: "buy", label: "See it as a buying opportunity", riskLevel: 4 },
    ],
  },
];

export const SuitabilityQuiz: React.FC<SuitabilityQuizProps> = ({
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswerChange = (
    questionId: number,
    value: string,
    riskLevel: number,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { value, riskLevel },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allQuestionsAnswered = questions.every((q) => answers[q.id]);

    if (!allQuestionsAnswered) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const totalRiskScore = Object.values(answers).reduce(
      (sum, ans) => sum + ans.riskLevel,
      0,
    );
    const averageRiskScore = totalRiskScore / questions.length;

    const payload = {
      answers,
      summary: {
        totalRiskScore,
        averageRiskScore,
        riskLevel:
          averageRiskScore <= 1.5
            ? "Conservative"
            : averageRiskScore <= 2.5
              ? "Moderate"
              : averageRiskScore <= 3.5
                ? "Growth"
                : "Aggressive Growth",
        submittedAt: new Date().toISOString(),
      },
    };

    console.log("Quiz Answers:", payload);

    if (onSubmit) {
      onSubmit(answers);
    }

    setSubmitted(true);
  };

  const handleStartOver = () => {
    setSubmitted(false);
    setAnswers({});
  };

  if (submitted) {
    return (
      <div
        className="max-w-2xl mx-auto p-8 bg-green-50 rounded-lg text-center"
        role="alert"
        aria-live="polite"
      >
        <h2 className="text-2xl font-semibold text-green-800 mb-4">
          ✓ Certification Submitted Successfully
        </h2>
        <p className="text-green-700 mb-6">
          Thank you for completing the suitability quiz. Your responses have
          been recorded.
        </p>
        <button
          onClick={handleStartOver}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
          aria-label="Start quiz over"
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Restricted Investor Suitability Quiz
      </h1>
      <p className="text-gray-600 mb-8">
        Please answer all questions to determine your investment suitability.
      </p>

      <form onSubmit={handleSubmit} aria-label="Investment suitability quiz">
        {questions.map((question) => (
          <fieldset
            key={question.id}
            className="mb-8 p-4 border border-gray-200 rounded-lg"
          >
            <legend className="text-lg font-semibold text-gray-800 mb-4">
              {question.id}. {question.text}
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            </legend>

            <div
              className="space-y-3"
              role="radiogroup"
              aria-label={`Question ${question.id}`}
            >
              {question.options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center p-3 hover:bg-gray-50 rounded cursor-pointer transition"
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.value}
                    checked={answers[question.id]?.value === option.value}
                    onChange={() =>
                      handleAnswerChange(
                        question.id,
                        option.value,
                        option.riskLevel,
                      )
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    aria-label={`Option: ${option.label}`}
                    required
                  />
                  <span className="ml-3 text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition transform active:scale-95"
            aria-label="Submit certification"
          >
            Submit Certification
          </button>
        </div>
      </form>

      <div className="mt-6 text-sm text-gray-500 border-t pt-4">
        ⚠️ This quiz is for compliance purposes. Your answers will be recorded.
      </div>
    </div>
  );
};
