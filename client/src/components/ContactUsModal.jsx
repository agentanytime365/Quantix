import React, { useState, useRef, useEffect } from 'react';
import { X, Send, AlertCircle, CheckCircle, Loader, MessageSquare } from 'lucide-react';

const ContactUsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [includeLogs, setIncludeLogs] = useState(true);
  const overlayRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issueType: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // ── System info capture ────────────────────────────────────────────────────
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let name = 'Unknown', version = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      name = 'Chrome'; version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox'; version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      name = 'Safari'; version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (ua.includes('Edg')) {
      name = 'Edge'; version = ua.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }
    return { name, version };
  };

  const getNavigationTimings = () => {
    if (!window.performance?.timing) return 'Not available';
    const t = window.performance.timing;
    return {
      pageLoadTime: Math.round(t.loadEventEnd - t.navigationStart) + 'ms',
      domContentLoadTime: Math.round(t.domContentLoadedEventEnd - t.navigationStart) + 'ms',
      resourceLoadTime: Math.round(t.responseEnd - t.fetchStart) + 'ms',
    };
  };

  const collectSystemInfo = () => ({
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    browser: getBrowserInfo(),
    url: window.location.href,
    screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    memoryUsage: performance.memory ? {
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB',
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
    } : 'Not available',
    navigationTimings: getNavigationTimings(),
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.issueType) errors.issueType = 'Please select an issue type';
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Please provide more detail (at least 10 characters)';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const payload = {
        ...formData,
        systemInfo: includeLogs ? collectSystemInfo() : null,
        timestamp: new Date().toISOString(),
      };

      const res = await fetch('/api/contact/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Server error');

      setFormData({ name: '', email: '', issueType: '', description: '' });
      setSubmitStatus('success');
      setTimeout(() => { setIsOpen(false); setSubmitStatus(null); }, 2500);
    } catch (err) {
      console.error('[ContactUs] submit error:', err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setSubmitStatus(null);
    setFormErrors({});
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) handleClose();
  };

  return (
    <>
      {/* Floating trigger button */}
      <button className="contact-fab" onClick={() => setIsOpen(true)} title="Contact Us / Report an Issue">
        <MessageSquare size={18} />
        <span>Contact Us</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="contact-overlay" ref={overlayRef} onClick={handleOverlayClick}>
          <div className="contact-modal">

            {/* Header */}
            <div className="contact-modal-header">
              <div>
                <h2 className="contact-modal-title">Report an Issue</h2>
                <p className="contact-modal-subtitle">Help us improve — share feedback or any issue you encountered</p>
              </div>
              <button className="contact-modal-close" onClick={handleClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="contact-modal-body">
              {submitStatus === 'success' && (
                <div className="contact-status contact-status--success">
                  <CheckCircle size={16} />
                  <span>Thank you! Your report has been submitted successfully.</span>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className="contact-status contact-status--error">
                  <AlertCircle size={16} />
                  <span>Something went wrong. Please try again.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* Name + Email row */}
                <div className="contact-row">
                  <div className="contact-field">
                    <label className="contact-label">Your Name <span className="contact-required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Jane Smith"
                      className={`contact-input ${formErrors.name ? 'contact-input--error' : ''}`}
                      disabled={isSubmitting}
                      autoComplete="name"
                    />
                    {formErrors.name && (
                      <span className="contact-error"><AlertCircle size={12} />{formErrors.name}</span>
                    )}
                  </div>
                  <div className="contact-field">
                    <label className="contact-label">Email Address <span className="contact-required">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="jane@example.com"
                      className={`contact-input ${formErrors.email ? 'contact-input--error' : ''}`}
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                    {formErrors.email && (
                      <span className="contact-error"><AlertCircle size={12} />{formErrors.email}</span>
                    )}
                  </div>
                </div>

                {/* Issue Type */}
                <div className="contact-field">
                  <label className="contact-label">Issue Type <span className="contact-required">*</span></label>
                  <select
                    name="issueType"
                    value={formData.issueType}
                    onChange={handleInputChange}
                    className={`contact-input contact-select ${formErrors.issueType ? 'contact-input--error' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select issue type…</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="performance">Performance Issue</option>
                    <option value="ui-ux">UI / UX Feedback</option>
                    <option value="export">Export Problem</option>
                    <option value="generation">Test Generation Issue</option>
                    <option value="other">Other</option>
                  </select>
                  {formErrors.issueType && (
                    <span className="contact-error"><AlertCircle size={12} />{formErrors.issueType}</span>
                  )}
                </div>

                {/* Description */}
                <div className="contact-field">
                  <label className="contact-label">Description <span className="contact-required">*</span></label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Please describe the issue in detail — what happened, what you expected, and any steps to reproduce it…"
                    className={`contact-input contact-textarea ${formErrors.description ? 'contact-input--error' : ''}`}
                    disabled={isSubmitting}
                  />
                  {formErrors.description && (
                    <span className="contact-error"><AlertCircle size={12} />{formErrors.description}</span>
                  )}
                </div>

                {/* Include logs toggle */}
                <label className="contact-logs-row">
                  <input
                    type="checkbox"
                    className="contact-checkbox"
                    checked={includeLogs}
                    onChange={(e) => setIncludeLogs(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <div>
                    <span className="contact-logs-title">Attach system diagnostic info</span>
                    <span className="contact-logs-sub">Browser, screen resolution, performance timings, and memory usage</span>
                  </div>
                </label>

              </form>
            </div>

            {/* Footer */}
            <div className="contact-modal-footer">
              <button
                type="button"
                className="contact-btn-cancel"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="contact-btn-submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader size={15} className="contact-spinner" /><span>Submitting…</span></>
                ) : (
                  <><Send size={15} /><span>Submit Report</span></>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default ContactUsModal;
