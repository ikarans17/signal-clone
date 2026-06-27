"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

type Step = "login" | "register" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingData, setPendingData] = useState<any>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    display_name: "",
    phone_number: "",
  });

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/auth/login", {
        username: form.username,
        password: form.password,
      });
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Welcome back!");
      router.push("/chat");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.password || !form.display_name || !form.phone_number) {
      toast.error("Please fill all fields");
      return;
    }
    setPendingData(form);
    setStep("otp");
    toast.success("OTP sent! Use 123456 to verify", { duration: 4000 });
  };

  const handleOTPVerify = async () => {
    if (otp !== "123456") {
      toast.error("Invalid OTP. Use 123456");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/auth/register", pendingData);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success("Account created!");
      router.push("/chat");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      height: "100vh", background: "#111b21"
    }}>
      <div style={{
        background: "#202c33", borderRadius: "16px", padding: "40px",
        width: "400px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            background: "#00a884", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 16px", fontSize: "32px"
          }}>💬</div>
          <h1 style={{ color: "#e9edef", fontSize: "24px", fontWeight: "600" }}>Signal</h1>
          <p style={{ color: "#8696a0", fontSize: "14px", marginTop: "4px" }}>
            {step === "otp" ? "Enter verification code" : step === "register" ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {/* OTP Step */}
        {step === "otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ background: "#2a3942", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <p style={{ color: "#8696a0", fontSize: "13px" }}>OTP sent to</p>
              <p style={{ color: "#00a884", fontSize: "15px", fontWeight: "600" }}>{pendingData?.phone_number}</p>
              <p style={{ color: "#8696a0", fontSize: "12px", marginTop: "4px" }}>Demo OTP: <strong style={{ color: "#00a884" }}>123456</strong></p>
            </div>
            <input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              style={{ ...inputStyle, textAlign: "center", fontSize: "24px", letterSpacing: "8px" }}
            />
            <button onClick={handleOTPVerify} disabled={loading} style={btnStyle(loading)}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <p
              onClick={() => setStep("register")}
              style={{ textAlign: "center", color: "#00a884", fontSize: "14px", cursor: "pointer" }}
            >
              ← Back
            </p>
          </div>
        )}

        {/* Login Step */}
        {step === "login" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input placeholder="Username" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} style={inputStyle} />
            <input placeholder="Password" type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={inputStyle} />
            <button onClick={handleLogin} disabled={loading} style={btnStyle(loading)}>
              {loading ? "Please wait..." : "Sign In"}
            </button>
            <p style={{ textAlign: "center", color: "#8696a0", fontSize: "14px" }}>
              Don't have an account?{" "}
              <span onClick={() => setStep("register")} style={{ color: "#00a884", cursor: "pointer" }}>
                Register
              </span>
            </p>
            <div style={{ background: "#2a3942", borderRadius: "8px", padding: "12px" }}>
              <p style={{ color: "#8696a0", fontSize: "12px", textAlign: "center" }}>
                Demo: karan / alice / bob / sara / raj<br />
                Password: <strong style={{ color: "#00a884" }}>password123</strong>
              </p>
            </div>
          </div>
        )}

        {/* Register Step */}
        {step === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input placeholder="Username" value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })} style={inputStyle} />
            <input placeholder="Password" type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} />
            <input placeholder="Display Name" value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })} style={inputStyle} />
            <input placeholder="Phone Number (e.g. +911234567890)" value={form.phone_number}
              onChange={e => setForm({ ...form, phone_number: e.target.value })} style={inputStyle} />
            <button onClick={handleRegister} disabled={loading} style={btnStyle(loading)}>
              Send OTP
            </button>
            <p style={{ textAlign: "center", color: "#8696a0", fontSize: "14px" }}>
              Already have an account?{" "}
              <span onClick={() => setStep("login")} style={{ color: "#00a884", cursor: "pointer" }}>
                Sign In
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#2a3942", border: "1px solid #3a4a54", borderRadius: "8px",
  padding: "12px 16px", color: "#e9edef", fontSize: "15px", outline: "none", width: "100%",
};

const btnStyle = (loading: boolean): React.CSSProperties => ({
  background: "#00a884", color: "white", border: "none", borderRadius: "8px",
  padding: "14px", fontSize: "16px", fontWeight: "600", cursor: "pointer",
  marginTop: "8px", opacity: loading ? 0.7 : 1, width: "100%",
});