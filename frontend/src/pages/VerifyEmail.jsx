import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const verifyToken = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/auth/verify-email", { token });
      setMessage(response.data.message);
      
      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      setMessage(
        error.response?.data?.message || 
        "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Automatically verify when token exists in URL
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  return (
    <div className="verification-container">
      <h2>Email Verification</h2>
      
      {isLoading ? (
        <p>Verifying your email...</p>
      ) : message ? (
        <p className={message.includes("success") ? "success" : "error"}>
          {message}
        </p>
      ) : (
        <>
          <p>Please enter your verification code:</p>
          <input
            type="text"
            placeholder="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={verifyToken} disabled={!code}>
            Verify Email
          </button>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;