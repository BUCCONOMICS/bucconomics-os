import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { OnboardingFlow } from "./OnboardingFlow";
import { getUserStatus, recordKyc, type UserStatus } from "../../lib/api";

jest.mock("../../lib/api", () => ({
  getUserStatus: jest.fn(),
  recordKyc: jest.fn(),
}));

jest.mock("@repo/wallet", () => ({
  MockWalletProvider: class {
    async connect() {
      return {
        address: "0xabc123",
        handle: { mock: true, createdAt: new Date().toISOString() },
      };
    }
  },
}));

const mockedGetUserStatus = getUserStatus as jest.MockedFunction<
  typeof getUserStatus
>;
const mockedRecordKyc = recordKyc as jest.MockedFunction<typeof recordKyc>;

const address = "0xabc123";

const coolingStatus = (overrides: Partial<UserStatus> = {}): UserStatus => ({
  user_uid: address,
  kyc_status: "passed",
  risk_band: "HIGH",
  cooling_off_ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  cooling_off_complete: false,
  can_mint: false,
  ...overrides,
});

const accepted = () => ({
  status: "accepted" as const,
  user_uid: address,
  cooling_off_ends_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
});

async function answerQuizAndConnect() {
  render(<OnboardingFlow />);
  const radios = screen.getAllByRole("radio");
  radios.forEach((radio) => fireEvent.click(radio));
  fireEvent.click(
    screen.getByRole("button", { name: /Submit Certification/i }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Connect smart account/i }),
  );
}

describe("OnboardingFlow KYC wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("records KYC on connect and blocks minting during cooling-off", async () => {
    mockedGetUserStatus
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(coolingStatus());
    mockedRecordKyc.mockResolvedValue(accepted());

    await answerQuizAndConnect();

    await waitFor(() => {
      expect(mockedRecordKyc).toHaveBeenCalledWith(address, "HIGH");
    });
    expect(
      await screen.findByText(/Regulatory cooling-off in progress/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Mint BUCC_UID/i }),
    ).toBeDisabled();
  });

  it("does not re-record KYC for a returning user with a record", async () => {
    mockedGetUserStatus.mockResolvedValue(coolingStatus());

    await answerQuizAndConnect();

    await waitFor(() => {
      expect(mockedGetUserStatus).toHaveBeenCalledWith(address);
    });
    expect(mockedRecordKyc).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Regulatory cooling-off in progress/i),
    ).toBeInTheDocument();
  });

  it("enables minting once can_mint is true and advances to tranches", async () => {
    mockedGetUserStatus.mockResolvedValue(
      coolingStatus({ can_mint: true, cooling_off_complete: true }),
    );

    await answerQuizAndConnect();

    const mintButton = await screen.findByRole("button", {
      name: /Mint BUCC_UID/i,
    });
    await waitFor(() => expect(mintButton).toBeEnabled());
    fireEvent.click(mintButton);

    expect(
      screen.getByRole("heading", { name: /Choose your tranche/i }),
    ).toBeInTheDocument();
  });

  it("shows an error and keeps minting disabled when KYC sync fails", async () => {
    mockedGetUserStatus.mockResolvedValue(null);
    mockedRecordKyc.mockRejectedValue(new Error("network down"));

    await answerQuizAndConnect();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/network down/i);
    expect(
      screen.getByRole("button", { name: /Mint BUCC_UID/i }),
    ).toBeDisabled();
  });
});
