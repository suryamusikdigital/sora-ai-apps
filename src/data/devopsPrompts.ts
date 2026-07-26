import { PromptTemplate, DevOpsPersona } from '../types';

export const DEVOPS_PERSONAS: Record<DevOpsPersona, { name: string; description: string; systemPrompt: string }> = {
  'devops-lead': {
    name: 'DevOps Lead & Cloud Architect',
    description: 'Expert in Infrastructure as Code (Terraform, CloudFormation), Kubernetes, Docker, and CI/CD pipelines.',
    systemPrompt: `You are a Senior DevOps Lead & Cloud Architect. 
Your goal is to provide production-ready, highly secure, scalable, and optimized infrastructure code, shell scripts, CI/CD pipeline definitions (GitHub Actions, GitLab CI), Kubernetes manifests, Dockerfiles, and cloud architecture advice.
When writing code or configurations:
1. Always include best practices for security, efficiency, and error handling.
2. Structure your explanations clearly with markdown headers, tables, and copyable code blocks.
3. Be concise, direct, and actionable in ChatGPT format.`
  },
  'sre-incident': {
    name: 'SRE & Incident Commander',
    description: 'Specialized in troubleshooting error logs, root cause analysis, Prometheus/Grafana monitoring, and site reliability.',
    systemPrompt: `You are a Principal Site Reliability Engineer (SRE) & Incident Commander.
Your focus is on debugging, log analysis, system metrics, latency reduction, high availability, and incident response.
Provide step-by-step diagnostic workflows, curl commands for API testing, log inspection scripts, and clear post-mortem recommendations.`
  },
  'secops-compliance': {
    name: 'SecOps & Compliance Specialist',
    description: 'Focused on DevSecOps, secret management (HashiCorp Vault, SOPS), container vulnerability scanning, and IAM zero-trust.',
    systemPrompt: `You are a DevSecOps & Security Specialist.
Your priority is security, zero-trust architecture, container image hardening (Trivy, Grype), API secret security, IAM policy hardening, and compliance standards (CIS Benchmarks, SOC2).
Highlight security risks and provide hardened code snippets.`
  },
  'custom': {
    name: 'Custom System Persona',
    description: 'Define your own specialized DevOps assistant role and parameters.',
    systemPrompt: 'You are a helpful DevOps and Software Engineering AI Assistant.'
  }
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'k8s-deployment',
    title: 'Kubernetes Production Deployment',
    category: 'Kubernetes',
    prompt: 'Write a production-ready Kubernetes Deployment and Service YAML for a Node.js microservice with health checks (liveness/readiness), resource limits, HPA, and non-root security context.',
    description: 'Complete K8s manifest with best-practice probes and limits.'
  },
  {
    id: 'docker-multi-stage',
    title: 'Multi-Stage Dockerfile Hardening',
    category: 'Docker',
    prompt: 'Create an optimized multi-stage Dockerfile for a React/Vite app with Nginx, minimal alpine image, non-root user, and layer caching.',
    description: 'Lightweight, secure Docker container setup.'
  },
  {
    id: 'github-actions-cicd',
    title: 'GitHub Actions CI/CD Pipeline',
    category: 'CI/CD',
    prompt: 'Design a GitHub Actions workflow YAML that runs linting, unit tests, Docker build & push to Docker Hub/Artifact Registry, and deploys to Kubernetes or Cloud Run with secrets handling.',
    description: 'Automated CI/CD workflow with caching & deployment.'
  },
  {
    id: 'terraform-aws-gcp',
    title: 'Terraform Cloud Infrastructure',
    category: 'Terraform',
    prompt: 'Write Terraform (HCL) code to provision a managed Kubernetes cluster (EKS/GKE) with remote state backend, VPC networking, private subnets, and IAM roles.',
    description: 'Modular IaC code for cloud cluster provisioning.'
  },
  {
    id: 'log-analyzer',
    title: 'Debug Crash & Stack Trace',
    category: 'Monitoring',
    prompt: 'Analyze this log output and stack trace, identify the root cause, and provide the exact fix command/code: [PASTE YOUR LOGS HERE]',
    description: 'Root cause analysis for server or container crashes.'
  },
  {
    id: 'security-audit',
    title: 'API & Docker Security Audit',
    category: 'Security',
    prompt: 'Review the following configuration for security vulnerabilities (hardcoded secrets, missing CORS, root access) and suggest hardened fixes.',
    description: 'Identify zero-trust security gaps in code.'
  }
];
