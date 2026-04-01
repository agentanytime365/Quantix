import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, AlertCircle } from 'lucide-react';

const sections = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing and using Quantix ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

Quantix is an AI-powered test case generation tool designed to help users create comprehensive test cases for quality assurance purposes. By using this Service, you acknowledge that you have read, understood, and agree to all terms herein.`
  },
  {
    id: 'ip-rights',
    title: '2. Intellectual Property Rights & Ownership',
    content: `2.1 OWNERSHIP OF SERVICE
Quantix, including all its features, functionality, design, code, algorithms, and user interface, is the sole and exclusive intellectual property of the Quantix team. All rights are reserved worldwide.

2.2 COPYRIGHT & TRADEMARK PROTECTION
The Quantix name, logo, and all associated trademarks, service marks, and trade dress are the exclusive property of Quantix. Unauthorized use, reproduction, or distribution of these marks without written permission is strictly prohibited.

2.3 AI TECHNOLOGY PROTECTION
The underlying artificial intelligence models, machine learning algorithms, and AI architecture used in Quantix are proprietary and confidential. These technologies are protected under:
• International copyright law
• Trade secret protection
• Patent applications (pending)
• Confidentiality agreements

2.4 PROHIBITION ON REVERSE ENGINEERING & AI TRAINING
Users STRICTLY AGREE NOT TO:
• Attempt to reverse engineer, decompile, or discover the source code of Quantix
• Use automated tools, bots, or scripts to extract the AI model or algorithm
• Train, fine-tune, or create derivative AI/ML models using Quantix's output
• Attempt to recreate, clone, or build competing products based on Quantix technology
• Share API keys or credentials that could enable unauthorized access
• Extract bulk data from Quantix for model training purposes

Violation of this clause may result in immediate account termination and legal action.

2.5 USER-GENERATED CONTENT
While you retain ownership of test cases and content you generate, you grant Quantix a non-exclusive, royalty-free license to:
• Store and backup your data
• Use aggregated, anonymized data to improve the Service
• Use error logs and system information for debugging and enhancement

You retain the right to delete your content at any time, upon which Quantix will remove it within 30 days.`
  },
  {
    id: 'license',
    title: '3. License & Permitted Use',
    content: `3.1 LIMITED LICENSE
Quantix grants you a non-exclusive, non-transferable, revocable license to use the Service for lawful purposes only. This license does not permit:
• Commercial resale or distribution
• Removal or modification of any copyright, trademark, or proprietary notices
• Creation of derivative works
• Use for competitive intelligence or benchmarking

3.2 ACCEPTABLE USE
You agree to use Quantix only for legitimate quality assurance, software testing, and test case generation purposes. You shall not:
• Use the Service for illegal activities
• Attempt to gain unauthorized access
• Interfere with or disrupt the Service's operation
• Upload malicious code or harmful content
• Violate any applicable laws or regulations

3.3 RATE LIMITING
Users agree to comply with rate limiting and usage quotas. Excessive usage that impacts Service performance may result in temporary suspension.`
  },
  {
    id: 'security-breach',
    title: '4. Security Breaches & Data Protection',
    content: `4.1 SECURITY MEASURES
Quantix implements industry-standard security practices including:
• Encryption of data in transit (HTTPS/TLS)
• Secure password hashing and storage
• Regular security audits and penetration testing
• Secure API authentication (JWT tokens)
• Regular backups and disaster recovery procedures

However, no system is 100% secure. Users understand and accept that security risks exist.

4.2 DATA BREACH NOTIFICATION
In the event of a confirmed data breach affecting user data, Quantix commits to:
• Notifying affected users within 72 hours of discovery
• Providing clear information about what data was compromised
• Offering guidance on protective measures users should take
• Providing a dedicated support channel for affected users
• Documenting the breach and corrective actions taken

Notifications will be sent via:
• Email to the registered user account email
• In-app notifications
• Public announcement on the Quantix website

4.3 USER RESPONSIBILITY
Users acknowledge responsibility for:
• Maintaining the confidentiality of their login credentials
• Immediately reporting suspicious account activity
• Not sharing API keys or authentication tokens
• Logging out after each session on shared devices
• Keeping their contact information current

Users who fail to report breaches promptly may have reduced liability protection.

4.4 SECURITY UPDATES
Quantix will promptly issue security patches for discovered vulnerabilities. Users are responsible for:
• Installing updates in a timely manner
• Testing updates in non-production environments
• Reporting security issues responsibly (security@quantix-tool.com)

4.5 THIRD-PARTY SECURITY
Quantix uses third-party services (databases, APIs, hosting). While we select reputable vendors, we cannot guarantee their security. Users accept responsibility for evaluating third-party security practices.`
  },
  {
    id: 'liability',
    title: '5. Limitation of Liability & Disclaimers',
    content: `5.1 DISCLAIMER OF WARRANTIES
QUANTIX IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING:
• MERCHANTABILITY
• FITNESS FOR A PARTICULAR PURPOSE
• NON-INFRINGEMENT
• ACCURACY OR COMPLETENESS
• UNINTERRUPTED SERVICE

5.2 NO LIABILITY FOR INDIRECT DAMAGES
IN NO EVENT SHALL QUANTIX BE LIABLE FOR:
• Loss of profits or revenue
• Loss of data or business interruption
• Indirect, incidental, or consequential damages
• Damages arising from use or inability to use the Service
• Third-party claims or damages
• Any damages exceeding the amount paid by user in past 12 months (or $100, whichever is less)

5.3 USER ASSUMES ALL RISK
You acknowledge that:
• Test cases generated may require human review and validation
• Quantix provides suggestions and recommendations, not guarantees
• You are responsible for testing before deployment
• Generated content does not replace professional QA review
• Reliance on AI-generated content without validation is at your own risk

5.4 SERVICE AVAILABILITY
Quantix does not guarantee continuous, uninterrupted service. We are not liable for:
• Scheduled or unscheduled maintenance
• Infrastructure failures
• Third-party service outages
• Force majeure events
• Temporary service degradation

5.5 DATA LOSS
Quantix maintains backups, but cannot guarantee zero data loss. You are responsible for:
• Maintaining your own backups
• Exporting critical data regularly
• Understanding backup retention policies
• Accepting that deleted data may be permanently lost after 30 days`
  },
  {
    id: 'user-obligations',
    title: '6. User Obligations & Restrictions',
    content: `6.1 LEGAL COMPLIANCE
You agree to use Quantix in compliance with all applicable laws and regulations, including:
• Data protection laws (GDPR, CCPA, etc.)
• Export control regulations
• Industry-specific compliance requirements (HIPAA, SOC 2, etc.)
• Intellectual property laws

6.2 PROHIBITED CONTENT
You shall not upload, generate, or store:
• Illegal content
• Confidential company information or trade secrets
• Personal identifying information of others (without consent)
• Malware or harmful code
• Content violating third-party intellectual property rights

6.3 ACCOUNT SECURITY
You are responsible for:
• Choosing a strong, unique password
• Not sharing your account credentials
• Immediately reporting unauthorized access
• Monitoring for suspicious activity
• Keeping contact information current

6.4 TESTING RESPONSIBILITY
You acknowledge:
• You are solely responsible for testing generated test cases
• Test case quality depends on requirements provided
• AI-generated content requires human review
• You must validate output before production use
• Generated tests may not cover all edge cases

6.5 COMPLIANCE RESPONSIBILITY
You are responsible for ensuring:
• Your use complies with internal policies
• Generated content meets compliance requirements
• Regulatory obligations are fulfilled
• Industry standards are maintained
• No confidential information is inadvertently exposed`
  },
  {
    id: 'privacy',
    title: '7. Privacy & Data Collection',
    content: `7.1 INFORMATION WE COLLECT
Quantix collects:
• Account information (name, email, company)
• Usage data (features used, time on platform)
• System information (browser, device, OS)
• IP address and access logs
• Error logs and performance metrics
• Feedback and support communications

7.2 HOW WE USE YOUR DATA
We use collected data to:
• Provide and improve the Service
• Troubleshoot issues and prevent fraud
• Analyze usage patterns and trends
• Send product updates and important notices
• Comply with legal obligations
• Enhance security and prevent abuse

7.3 DATA SHARING
We do NOT sell user data. We may share data with:
• Service providers (hosting, analytics, payment processing)
• Legal authorities (if required by law)
• As part of a merger or acquisition
• With your explicit consent

7.4 DATA RETENTION
We retain user data for:
• Active accounts: for the duration of service plus 30 days after deletion
• Deleted accounts: up to 90 days for backup/recovery purposes
• Log files: 30 days (older logs are anonymized)
• Analytics: indefinitely in aggregated/anonymized form

7.5 YOUR RIGHTS
You have the right to:
• Access your personal data
• Request data deletion (right to be forgotten)
• Correct inaccurate information
• Export your data in standard format
• Withdraw consent at any time

Requests should be sent to: privacy@quantix-tool.com`
  },
  {
    id: 'termination',
    title: '8. Termination & Suspension',
    content: `8.1 ACCOUNT TERMINATION
We may suspend or terminate your account if:
• You violate these Terms & Conditions
• You attempt to reverse engineer or attack Quantix
• You engage in illegal activities
• You harass our staff or other users
• Your account shows signs of compromise
• Payment fails (for paid plans)

8.2 YOUR RIGHT TO TERMINATE
You may terminate your account at any time by:
• Logging into Settings > Account > Delete Account
• Contacting support@quantix-tool.com with termination request
• Upon termination, all data will be deleted within 30 days

8.3 SURVIVAL
The following sections survive termination:
• Intellectual Property Rights
• Limitation of Liability
• Indemnification
• Governing Law & Dispute Resolution`
  },
  {
    id: 'indemnification',
    title: '9. Indemnification',
    content: `You agree to indemnify and hold harmless Quantix from:
• Claims arising from your use of the Service
• Violation of these Terms & Conditions
• Violation of applicable laws
• Infringement of third-party rights
• Content you upload or generate
• Your negligence or willful misconduct
• Claims by third parties related to your use

This includes all legal fees, court costs, and damages awarded against Quantix.`
  },
  {
    id: 'governing-law',
    title: '10. Governing Law & Dispute Resolution',
    content: `10.1 GOVERNING LAW
These Terms & Conditions are governed by the laws of Australia, without regard to its conflict of law principles.

10.2 DISPUTE RESOLUTION
In case of disputes:
• First, attempt to resolve in writing (good faith negotiation)
• If unresolved after 30 days, submit to binding arbitration
• Arbitration will be conducted by a single neutral arbitrator
• Arbitration location: Sydney, Australia
• Each party bears its own attorney fees unless arbitrator awards them

10.3 CLASS ACTION WAIVER
You agree not to pursue claims as part of a class action lawsuit or class arbitration. Claims must be brought individually.

10.4 INJUNCTIVE RELIEF
You acknowledge that breach of IP or security clauses may cause irreparable harm. Quantix reserves the right to seek injunctive relief in addition to other remedies.`
  },
  {
    id: 'amendments',
    title: '11. Changes to Terms',
    content: `Quantix reserves the right to modify these Terms & Conditions at any time. Changes will be:
• Posted on the website with effective date
• Sent via email to registered users
• Effective 14 days after notice (or immediately for security changes)

Continued use of Quantix after changes constitutes acceptance. If you disagree with changes, you may terminate your account.`
  },
  {
    id: 'contact',
    title: '12. Contact Us',
    content: `For questions about these Terms & Conditions, please contact:

Quantix Support Team
Email: legal@quantix-tool.com
Support Portal: support.quantix-tool.com

Response time: Within 5 business days

Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  }
];

export default function TermsAndConditions({ theme = 'dark' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const modal = isOpen ? (
    <div className="toc-overlay" data-theme={theme} onClick={close}>
      <div className="toc-modal" onClick={e => e.stopPropagation()}>

        <div className="toc-header">
          <div>
            <h2 className="toc-title">Terms &amp; Conditions</h2>
            <p className="toc-subtitle">Quantix — AI-Powered Test Case Generation</p>
          </div>
          <button className="toc-close" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="toc-warning">
          <AlertCircle size={18} className="toc-warning-icon" />
          <span>
            <strong>Important:</strong> By using Quantix, you agree to these terms.
            Unauthorized access, reverse engineering, or use of our AI technology
            for competing products is strictly prohibited and may result in legal action.
          </span>
        </div>

        <div className="toc-body">
          {sections.map(section => (
            <div key={section.id} className="toc-section">
              <button
                className="toc-section-header"
                onClick={() => toggleSection(section.id)}
              >
                <span className="toc-section-title">{section.title}</span>
                <ChevronDown
                  size={18}
                  className={`toc-chevron ${expandedSections[section.id] ? 'open' : ''}`}
                />
              </button>

              <div className={`toc-section-body ${expandedSections[section.id] ? 'open' : ''}`}>
                <div className="toc-section-content">
                  {section.content.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="toc-footnote">
            <strong>Note:</strong> These Terms &amp; Conditions are effective as of the date
            shown above. This agreement covers all users and provides legal protection under
            intellectual property, contract, and tort law.
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button className="toc-footer-link" onClick={() => setIsOpen(true)}>
        Terms &amp; Conditions
      </button>
      {createPortal(modal, document.body)}
    </>
  );
}
