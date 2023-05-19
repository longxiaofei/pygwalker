import React from "react";

interface IloginLoadingProps {
}

const loginLoading: React.FC<IloginLoadingProps> = (props) => {
  return (
    <div style={{ position: "absolute", display: "flex", height: "100%", width: "100%", justifyContent: "center", alignItems: "center", background: "white" }}>
      <style>
          {`
          .animate-spin {
          position: "absolute";
          margin-left: -0.25rem;
          margin-right: 0.75rem;
          height: 1.25rem;
          width: 1.25rem;
          color: #fff;
          animation: spin 2s linear infinite;
          }
          @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
          }
          .opacity-25 {
          opacity: 0.25;
          }
          .opacity-75 {
          opacity: 0.75;
          }
          `}
      </style>
      <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="rgb(79,79,229)" strokeWidth="4"></circle>
        <path className="opacity-75" fill="rgb(79,79,229)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
};

export default loginLoading;
