module.exports = {
  apps: [
    {
      name: "nudmedi-api",
      cwd: "/Users/natcahponsongkaew/Downloads/nudmedi 2/backend",
      script: "npm",
      args: "run dev",
      env: { PORT: "4000" },
    },
    {
      name: "nudmedi-web",
      cwd: "/Users/natcahponsongkaew/Downloads/nudmedi 2/frontend",
      script: "npm",
      args: "run dev",
      env: { PORT: "3000" },
    },
    {
      name: "nudmedi-staff",
      cwd: "/Users/natcahponsongkaew/Downloads/nudmedi 2/staff",
      script: "npm",
      args: "run dev",
      env: { PORT: "3001" },
    },
    {
      name: "nudmedi-tunnel",
      script: "cloudflared",
      args: "tunnel run nudmedi-user",
    },
  ],
};
