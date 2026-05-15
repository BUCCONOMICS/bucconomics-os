"use client";

import { SuitabilityQuiz } from "../../src/components/compliance/SuitabilityQuiz";

export default function CompliancePage() {
  const handleQuizSubmit = (answers: any) => {
    console.log("Quiz completed:", answers);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <SuitabilityQuiz onSubmit={handleQuizSubmit} />
    </div>
  );
}
