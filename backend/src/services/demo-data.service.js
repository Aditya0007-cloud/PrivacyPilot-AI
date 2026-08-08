import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { AuditLog } from "../models/AuditLog.js";
import { Consent } from "../models/Consent.js";
import { DataDeletionRequest } from "../models/DataDeletionRequest.js";
import { PrivacyPolicy } from "../models/PrivacyPolicy.js";
import { User } from "../models/User.js";

const id = (suffix) => new mongoose.Types.ObjectId(`66a800000000000000000${suffix}`);

const DEMO_PASSWORD = "DemoPass123!";

export const demoIds = {
  company: id("001"),
  users: [id("002"), id("003"), id("004")],
  policy: id("010"),
  consents: [id("101"), id("102"), id("103"), id("104")],
  deletionRequests: [id("201"), id("202"), id("203")],
  auditLogs: [
    id("301"),
    id("302"),
    id("303"),
    id("304"),
    id("305"),
    id("306"),
    id("307"),
    id("308"),
  ],
};

export const demoAccounts = {
  company: {
    name: "Acme Digital Services",
    email: "demo.company@privacypilot.ai",
    password: DEMO_PASSWORD,
    role: "company",
  },
  users: [
    {
      name: "Aarav Mehta",
      email: "demo.user@privacypilot.ai",
      password: DEMO_PASSWORD,
      role: "user",
    },
    {
      name: "Meera Iyer",
      email: "demo.user2@privacypilot.ai",
      password: DEMO_PASSWORD,
      role: "user",
    },
    {
      name: "Kabir Rao",
      email: "demo.user3@privacypilot.ai",
      password: DEMO_PASSWORD,
      role: "user",
    },
  ],
};

const samplePolicyText = `
Acme Digital Services Privacy Policy

1. Personal data we collect
Acme Digital Services collects your name, email address, phone number, account location,
device information, browser type, IP address, app usage events, and analytics data when you
use our digital commerce and customer support services.

2. Purpose of processing
We use this information to create and secure your account, deliver requested services,
send transactional messages, provide customer support, prevent fraud, personalize
recommendations, measure product performance through analytics, and send marketing
communications where consent has been provided.

3. Consent
For marketing communications, personalized recommendations, analytics cookies, and
third-party sharing beyond service delivery, we ask for consent. Users can withdraw consent
through account privacy settings or by contacting support.

4. Sharing with third parties
We may share name, phone number, email address, location, device information, and usage
data with payment processors, delivery partners, cloud hosting providers, customer support
tools, analytics vendors, and fraud prevention services. We require vendors to process data
only for agreed purposes.

5. Data retention
Account and transaction records are retained while the account is active and for up to
seven years where required for tax, fraud prevention, dispute resolution, or legal obligations.
Marketing consent records are retained until consent is withdrawn and for audit evidence.
Analytics data is aggregated or deleted after 24 months where practical.

6. User rights
Users may request access, correction, withdrawal of consent, and deletion of personal data,
subject to applicable legal requirements. Requests can be submitted from privacy settings
or by emailing privacy@acmedigital.example.

7. Grievance mechanism
The Grievance Officer for Acme Digital Services can be reached at
grievance@acmedigital.example. We aim to acknowledge privacy grievances within 72 hours
and resolve them within a reasonable period.
`;

const demoAnalysis = {
  complianceScore: 84,
  riskLevel: "Medium",
  summary:
    "Acme Digital Services explains core personal data categories, purposes, third-party sharing, retention, consent withdrawal, user rights, and a grievance channel. The policy is demo-ready but some DPDP readiness details need more precision.",
  personalDataCollected: [
    "Name",
    "Email address",
    "Phone number",
    "Location",
    "Device information",
    "Usage and analytics data",
  ],
  processingPurposes: [
    "Account creation and security",
    "Service delivery",
    "Customer support",
    "Fraud prevention",
    "Personalized recommendations",
    "Analytics and product improvement",
    "Marketing communications with consent",
  ],
  thirdParties: [
    "Payment processors",
    "Delivery partners",
    "Cloud hosting providers",
    "Customer support tools",
    "Analytics vendors",
    "Fraud prevention services",
  ],
  retentionInformation: [
    "Account and transaction records retained while account is active and up to seven years where required",
    "Marketing consent records retained until withdrawal and for audit evidence",
    "Analytics data aggregated or deleted after 24 months where practical",
  ],
  consentMechanism:
    "Consent is described for marketing, recommendations, analytics cookies, and third-party sharing beyond service delivery. Withdrawal is available through privacy settings or support.",
  userRights: [
    "Access",
    "Correction",
    "Consent withdrawal",
    "Deletion request",
  ],
  grievanceMechanism:
    "Grievance Officer contact is listed as grievance@acmedigital.example with acknowledgement target of 72 hours.",
  complianceGaps: [
    "Consent notices could separate mandatory service processing from optional processing more clearly.",
    "Retention criteria use phrases like 'where practical' and should define operational deletion timelines more precisely.",
    "Third-party vendor categories are listed, but the policy does not name key processors or explain cross-border transfer controls.",
    "User rights process should describe identity verification and escalation steps.",
  ],
  recommendations: [
    "Add a concise DPDP notice table covering data category, purpose, consent basis, retention, and withdrawal method.",
    "Clarify exact retention and deletion timelines for analytics and support data.",
    "Publish a processor list or vendor category register with transfer safeguards.",
    "Document consent withdrawal handling and expected processing timelines.",
    "Expand grievance handling steps with escalation and resolution milestones.",
  ],
};

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const upsertUser = async ({ _id, account, passwordHash }) => {
  const existingUser = await User.findOne({ email: account.email });

  if (existingUser) {
    existingUser.name = account.name;
    existingUser.role = account.role;
    await existingUser.save();
    return existingUser;
  }

  return User.create({
    _id,
    name: account.name,
    email: account.email,
    password: passwordHash,
    role: account.role,
  });
};

export const ensureDemoData = async () => {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const company = await upsertUser({
    _id: demoIds.company,
    account: demoAccounts.company,
    passwordHash,
  });

  const users = [];

  for (const [index, account] of demoAccounts.users.entries()) {
    users.push(
      await upsertUser({
        _id: demoIds.users[index],
        account,
        passwordHash,
      }),
    );
  }

  await Consent.deleteMany({ companyId: company._id });
  await DataDeletionRequest.deleteMany({ companyId: company._id });
  await AuditLog.deleteMany({ companyId: company._id });
  await PrivacyPolicy.deleteMany({ companyId: company._id });

  await PrivacyPolicy.create({
    _id: demoIds.policy,
    companyId: company._id,
    originalFileName: "acme-digital-services-privacy-policy.pdf",
    extractedText: samplePolicyText.trim(),
    analysis: demoAnalysis,
    complianceScore: 84,
    riskLevel: "Medium",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  });

  await Consent.insertMany([
    {
      _id: demoIds.consents[0],
      userId: users[0]._id,
      companyId: company._id,
      purpose: "Marketing Communications",
      dataCategory: "Email + Phone",
      description: "Receive promotional communications and product updates",
      status: "granted",
      grantedAt: daysAgo(12),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    {
      _id: demoIds.consents[1],
      userId: users[0]._id,
      companyId: company._id,
      purpose: "Personalized Recommendations",
      dataCategory: "Browsing Activity",
      description: "Improve recommendations based on product and browsing activity",
      status: "granted",
      grantedAt: daysAgo(11),
      createdAt: daysAgo(11),
      updatedAt: daysAgo(10),
    },
    {
      _id: demoIds.consents[2],
      userId: users[0]._id,
      companyId: company._id,
      purpose: "Analytics",
      dataCategory: "Usage Data",
      description: "Analytics and product improvement",
      status: "withdrawn",
      grantedAt: daysAgo(16),
      withdrawnAt: daysAgo(2),
      createdAt: daysAgo(16),
      updatedAt: daysAgo(2),
    },
    {
      _id: demoIds.consents[3],
      userId: users[1]._id,
      companyId: company._id,
      purpose: "Third-party Sharing",
      dataCategory: "Contact + Delivery Data",
      description: "Share required details with delivery and service partners",
      status: "granted",
      grantedAt: daysAgo(8),
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
  ]);

  await DataDeletionRequest.insertMany([
    {
      _id: demoIds.deletionRequests[0],
      requestNumber: "REQ-1001",
      userId: users[0]._id,
      companyId: company._id,
      customerId: "CUST-10482",
      requestType: "data_deletion",
      description: "I want Acme to remove old marketing and analytics profile data.",
      reason: "I want Acme to remove old marketing and analytics profile data.",
      status: "pending",
      requestedAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      _id: demoIds.deletionRequests[1],
      requestNumber: "REQ-1002",
      userId: users[1]._id,
      companyId: company._id,
      customerId: "CUST-20931",
      requestType: "data_access",
      description: "Please provide a copy of the personal data linked to my account.",
      reason: "Please provide a copy of the personal data linked to my account.",
      status: "in_progress",
      requestedAt: daysAgo(3),
      reviewedAt: daysAgo(2),
      acceptedAt: daysAgo(2),
      processingStartedAt: daysAgo(1),
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      _id: demoIds.deletionRequests[2],
      requestNumber: "REQ-1003",
      userId: users[2]._id,
      companyId: company._id,
      customerId: "CUST-30125",
      requestType: "data_correction",
      description: "My saved delivery phone number is outdated and should be corrected.",
      reason: "My saved delivery phone number is outdated and should be corrected.",
      status: "completed",
      requestedAt: daysAgo(9),
      processedAt: daysAgo(5),
      reviewedAt: daysAgo(8),
      acceptedAt: daysAgo(8),
      processingStartedAt: daysAgo(6),
      completedAt: daysAgo(5),
      processedBy: company._id,
      completionNote: "Corrected contact data after verifying the customer identifier.",
      companyResponse: "Corrected contact data after verifying the customer identifier.",
      createdAt: daysAgo(9),
      updatedAt: daysAgo(5),
    },
  ]);

  await AuditLog.insertMany([
    {
      _id: demoIds.auditLogs[0],
      userId: users[0]._id,
      companyId: company._id,
      action: "CONSENT_GRANTED",
      resourceType: "Consent",
      resourceId: demoIds.consents[0],
      metadata: { actorId: users[0]._id.toString(), status: "granted", purpose: "Marketing Communications" },
      timestamp: daysAgo(12),
    },
    {
      _id: demoIds.auditLogs[1],
      userId: users[0]._id,
      companyId: company._id,
      action: "CONSENT_GRANTED",
      resourceType: "Consent",
      resourceId: demoIds.consents[1],
      metadata: { actorId: users[0]._id.toString(), status: "granted", purpose: "Personalized Recommendations" },
      timestamp: daysAgo(11),
    },
    {
      _id: demoIds.auditLogs[2],
      userId: users[1]._id,
      companyId: company._id,
      action: "CONSENT_GRANTED",
      resourceType: "Consent",
      resourceId: demoIds.consents[3],
      metadata: { actorId: users[1]._id.toString(), status: "granted", purpose: "Third-party Sharing" },
      timestamp: daysAgo(8),
    },
    {
      _id: demoIds.auditLogs[3],
      userId: users[2]._id,
      companyId: company._id,
      action: "DATA_RIGHTS_REQUEST_COMPLETED",
      resourceType: "DataRightsRequest",
      resourceId: demoIds.deletionRequests[2],
      metadata: {
        actorId: company._id.toString(),
        actorType: "COMPANY",
        customerId: "CUST-30125",
        requestNumber: "REQ-1003",
        requestType: "data_correction",
        status: "completed",
      },
      timestamp: daysAgo(5),
    },
    {
      _id: demoIds.auditLogs[4],
      userId: users[0]._id,
      companyId: company._id,
      action: "CONSENT_WITHDRAWN",
      resourceType: "Consent",
      resourceId: demoIds.consents[2],
      metadata: { actorId: users[0]._id.toString(), status: "withdrawn", purpose: "Analytics" },
      timestamp: daysAgo(2),
    },
    {
      _id: demoIds.auditLogs[5],
      userId: users[1]._id,
      companyId: company._id,
      action: "DATA_RIGHTS_REQUEST_PROCESSING_STARTED",
      resourceType: "DataRightsRequest",
      resourceId: demoIds.deletionRequests[1],
      metadata: {
        actorId: company._id.toString(),
        actorType: "COMPANY",
        customerId: "CUST-20931",
        requestNumber: "REQ-1002",
        requestType: "data_access",
        status: "in_progress",
      },
      timestamp: daysAgo(1),
    },
    {
      _id: demoIds.auditLogs[6],
      userId: users[0]._id,
      companyId: company._id,
      action: "DATA_RIGHTS_REQUEST_SUBMITTED",
      resourceType: "DataRightsRequest",
      resourceId: demoIds.deletionRequests[0],
      metadata: {
        actorId: users[0]._id.toString(),
        actorType: "USER",
        customerId: "CUST-10482",
        requestNumber: "REQ-1001",
        requestType: "data_deletion",
        status: "pending",
      },
      timestamp: daysAgo(1),
    },
    {
      _id: demoIds.auditLogs[7],
      userId: company._id,
      companyId: company._id,
      action: "POLICY_ANALYZED",
      resourceType: "PrivacyPolicy",
      resourceId: demoIds.policy,
      metadata: {
        actorId: company._id.toString(),
        actorType: "COMPANY",
        originalFileName: "acme-digital-services-privacy-policy.pdf",
        complianceScore: 84,
        riskLevel: "Medium",
        gaps: demoAnalysis.complianceGaps.length,
      },
      timestamp: daysAgo(4),
    },
  ]);

  return {
    company,
    users,
    accounts: demoAccounts,
    password: DEMO_PASSWORD,
  };
};
