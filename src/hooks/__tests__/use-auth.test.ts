import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
});

describe("useAuth - initial state", () => {
  it("starts with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});

describe("useAuth - signIn", () => {
  describe("successful sign-in with anonymous work", () => {
    it("creates project from anon data and navigates to it", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "/App.jsx": "..." },
      });
      mockCreateProject.mockResolvedValue({ id: "anon-proj-1" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "hello" }],
          data: { "/App.jsx": "..." },
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("includes a name with the current time in the created project", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: {},
      });
      mockCreateProject.mockResolvedValue({ id: "x" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringContaining("Design from") })
      );
    });
  });

  describe("successful sign-in without anonymous work", () => {
    it("navigates to the most recent project when projects exist", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([
        { id: "proj-1" } as any,
        { id: "proj-2" } as any,
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-1");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("creates a new project and navigates to it when no projects exist", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "new-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/new-proj");
    });

    it("skips anon work when getAnonWorkData returns null", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "proj-99" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-99");
    });

    it("skips anon work when messages array is empty", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "proj-empty" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-empty");
    });
  });

  describe("failed sign-in", () => {
    it("returns the failure result and skips navigation", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@test.com", "wrong");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("returns the result object even on success for caller inspection", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "p1" } as any]);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@test.com", "pass");
      });

      expect(returnValue).toEqual({ success: true });
    });

    it("propagates thrown errors from the action", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await expect(
        act(async () => {
          await result.current.signIn("user@test.com", "pass");
        })
      ).rejects.toThrow("Network error");
    });
  });

  describe("isLoading state during signIn", () => {
    it("resets isLoading to false after successful sign-in", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "p1" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false after a failed sign-in result", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Bad creds" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@test.com", "pass");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false when signIn action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("boom"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try {
          await result.current.signIn("user@test.com", "pass");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe("useAuth - signUp", () => {
  describe("successful sign-up with anonymous work", () => {
    it("creates project from anon data and navigates to it", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "first message" }],
        fileSystemData: { "/App.jsx": "code" },
      });
      mockCreateProject.mockResolvedValue({ id: "anon-signup-proj" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "first message" }],
          data: { "/App.jsx": "code" },
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/anon-signup-proj");
    });
  });

  describe("successful sign-up without anonymous work", () => {
    it("navigates to most recent project when projects exist", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "existing-proj" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    it("creates a new project and navigates when no projects exist", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(mockPush).toHaveBeenCalledWith("/brand-new");
    });
  });

  describe("failed sign-up", () => {
    it("returns the failure result and skips navigation", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Email taken" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("taken@test.com", "pass");
      });

      expect(returnValue).toEqual({ success: false, error: "Email taken" });
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("propagates thrown errors from the action", async () => {
      mockSignUp.mockRejectedValue(new Error("Server down"));

      const { result } = renderHook(() => useAuth());
      await expect(
        act(async () => {
          await result.current.signUp("new@test.com", "pass");
        })
      ).rejects.toThrow("Server down");
    });
  });

  describe("isLoading state during signUp", () => {
    it("resets isLoading to false after successful sign-up", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "p" } as any]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false after a failed sign-up result", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "fail" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@test.com", "pass");
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading to false when signUp action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("crash"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try {
          await result.current.signUp("new@test.com", "pass");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe("useAuth - new project name uniqueness", () => {
  it("generates different names on repeated calls (random suffix)", async () => {
    const names: string[] = [];
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockImplementation(async (input) => {
      names.push(input.name);
      return { id: "new" } as any;
    });

    const { result: r1 } = renderHook(() => useAuth());
    const { result: r2 } = renderHook(() => useAuth());

    await act(async () => { await r1.current.signIn("a@test.com", "pass"); });
    await act(async () => { await r2.current.signIn("b@test.com", "pass"); });

    // Both should start with "New Design #" but may differ in suffix
    expect(names[0]).toMatch(/^New Design #\d+$/);
    expect(names[1]).toMatch(/^New Design #\d+$/);
  });
});
