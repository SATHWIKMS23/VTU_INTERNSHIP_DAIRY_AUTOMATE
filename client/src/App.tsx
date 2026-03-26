import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PlayCircle, StopCircle, CheckCircle2, XCircle, Loader2, Search, X } from 'lucide-react';
import './index.css';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : 'https://vtu-internship-dairy-automate-backend.onrender.com/api';

const ALL_SKILLS = [
  "Accounting", "Adobe Illustrator", "Adobe Indesign", "Adobe Photoshop", "Android Studio",
  "Angular", "AWS", "Azure",
  "BIM FOR ARCHITECTURE", "BIM FOR CONSTRUCTION", "BIM FOR HIGHWAY ENGINEERING", "BIM FOR STRUCTURES",
  "Business Management", "Business operations and Strategy",
  "C++", "CakePHP", "Canva", "Cassandra", "Circuit Design", "Cloud access control", "CodeIgniter",
  "computer vision", "CSS",
  "D3.js", "Data encryption", "Data modeling", "Data visualization", "Database design",
  "Design with FPGA", "DevOps", "DHCP", "Digital Design", "Docker",
  "Economics", "Embedded Systems", "entrepreneurship",
  "Figma", "FilamentPHP", "Finance", "Firewall configuration", "Flutter",
  "Game design", "Game development", "Game engine", "Git", "Godot", "Google Cloud",
  "HTML", "Human Resource Management",
  "IaaS", "Indexing", "Intelligent Machines", "INTERIOR AND EXTERIOR DESIGN", "Inventory Management", "IoT",
  "Java", "JavaScript",
  "Keras", "Kotlin", "Kubernetes",
  "LAN", "Laravel", "Layout Design",
  "Machine learning", "Macro economics", "Management Information System", "Manufacturing", "Market Theory", "Marketing",
  "Matplotlib", "Micro economics", "MongoDB", "MySQL",
  "Natural language processing", "Network architecture", "Node.js", "NoSQL", "Numpy",
  "Objective-C", "Operations Management",
  "PaaS", "Pandas", "PHP", "Physical Design", "Planning & Control systems", "PostgreSQL", "Power BI",
  "PRODUCT DESIGN & 3D PRINTING", "PRODUCT DESIGN & MANUFACTURING",
  "Python", "PyTorch",
  "React", "React.js", "Risk management", "Ruby on Rails",
  "SaaS", "Sales & Marketing", "scikit-learn", "Seaborn", "SEO", "SQL",
  "Statistical analysis", "Statistics", "Swift",
  "Tableau", "TCP/IP", "TensorFlow", "TypeScript",
  "UI/UX", "UX design",
  "Verification & Validations", "VLSI Design", "VPNs", "Vue.js",
  "WAN", "WordPress",
  "Xamarin", "Xcode"
];

interface JobState {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  logs: string[];
  totalEntries?: number;
  currentEntry?: number;
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const [hours, setHours] = useState(6);
  const [showInAppPreview, setShowInAppPreview] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const screenshotInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  const pollInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (showInAppPreview && job && (job.status === 'pending' || job.status === 'processing')) {
      screenshotInterval.current = setInterval(fetchScreenshot, 2000);
      fetchScreenshot();
    } else {
      clearInterval(screenshotInterval.current);
      setScreenshot(null);
    }
    return () => clearInterval(screenshotInterval.current);
  }, [showInAppPreview, job?.status, job?.id]);

  const fetchScreenshot = async () => {
    if (!job?.id) return;
    try {
      const res = await axios.get(`${API_BASE}/jobs/${job.id}/screenshot`);
      setScreenshot(res.data.screenshot);
    } catch (err) {
      // Ignore screenshot errors
    }
  };

  useEffect(() => {
    if (job && (job.status === 'pending' || job.status === 'processing')) {
      pollInterval.current = setInterval(pollJobStatus, 2000);
    } else {
      clearInterval(pollInterval.current);
    }
    return () => clearInterval(pollInterval.current);
  }, [job?.status]);

  const pollJobStatus = async () => {
    if (!job?.id) return;
    try {
      const res = await axios.get(`${API_BASE}/jobs/${job.id}`);
      setJob(prev => ({ 
        ...prev!, 
        status: res.data.status, 
        logs: res.data.logs,
        totalEntries: res.data.totalEntries,
        currentEntry: res.data.currentEntry
      }));
    } catch (err) {
      console.error('Failed to poll job status');
    }
  };

  const startAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !docUrl) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/automate`, {
        email,
        password,
        docUrl,
        skills: selectedSkills,
        hours
      });
      setJob({ id: res.data.jobId, status: 'pending', logs: [] });
    } catch (err) {
      alert("Failed to start automation. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const cancelAutomation = async () => {
    if (!job?.id) return;
    try {
      await axios.post(`${API_BASE}/jobs/${job.id}/cancel`);
      setJob(prev => ({ ...prev!, status: 'failed', logs: [...prev!.logs, '⏹️ Cancellation requested...'] }));
    } catch (err) {
      alert("Failed to cancel job.");
    }
  };

  const renderStatusIcon = () => {
    switch(job?.status) {
      case 'completed': return <CheckCircle2 className="text-emerald-400" size={24} />;
      case 'failed': return <XCircle className="text-rose-400" size={24} />;
      default: return <Loader2 className="animate-spin text-blue-400" size={24} />;
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const filteredSkills = ALL_SKILLS.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()));
  const isDisabled = !!job && (job.status === 'pending' || job.status === 'processing');

  return (
    <div className="app-container">
      {/* Skills Modal */}
      {isSkillModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSkillModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0 }}>Select Skills</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {selectedSkills.length} of {ALL_SKILLS.length} selected
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="button" className="btn-ghost" onClick={() => setSelectedSkills([...ALL_SKILLS])}>Select All</button>
                <button type="button" className="btn-ghost" onClick={() => setSelectedSkills([])}>Clear</button>
                <button type="button" className="modal-close" onClick={() => setIsSkillModalOpen(false)}><X size={20}/></button>
              </div>
            </div>
            <div className="modal-search">
              <Search size={16} />
              <input
                type="text"
                autoFocus
                placeholder="Search skills..."
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                className="modal-search-input"
              />
            </div>
            <div className="modal-skills-grid">
              {filteredSkills.length > 0 ? filteredSkills.map(skill => (
                <div
                  key={skill}
                  className={`modal-skill-item ${selectedSkills.includes(skill) ? 'active' : ''}`}
                  onClick={() => toggleSkill(skill)}
                >
                  <span className="modal-skill-check">{selectedSkills.includes(skill) ? '✓' : ''}</span>
                  <span>{skill}</span>
                </div>
              )) : (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No skills match your search.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={() => { setIsSkillModalOpen(false); setSkillSearch(''); }}>
                Done — {selectedSkills.length} selected
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="glass-panel">
        
        <div className="header">
          <h1>VTU Diary Automator</h1>
          <p>Instantly submit your internship logs to VTU.</p>
        </div>

        <form onSubmit={startAutomation}>
          <div className="form-group">
            <label>VTU Email</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="Enter your VTU email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={!!job && (job.status === 'pending' || job.status === 'processing')}
            />
          </div>

          <div className="form-group">
            <label>VTU Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="Enter your VTU password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={!!job && (job.status === 'pending' || job.status === 'processing')}
            />
          </div>

          <div className="form-group">
            <label>Google Document URL</label>
            <input 
              type="url" 
              className="form-control" 
              placeholder="https://docs.google.com/document/d/.../pub"
              value={docUrl}
              onChange={e => setDocUrl(e.target.value)}
              required
              disabled={!!job && (job.status === 'pending' || job.status === 'processing')}
            />
            <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              📌 Tip: Use <strong>DD-MM-YYYY</strong> or <strong>DD/MM/YYYY</strong> for dates in your Google Doc.
            </p>
          </div>
          
          <div className="form-group">
            <label>Hours Worked (per day)</label>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: isDisabled ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isDisabled
                ? '⚠️ Hours cannot be changed while automation is running.'
                : '📌 Default hours to be logged for each day.'}
            </p>
            <div className="hours-grid">
              {Array.from({ length: 24 }, (_, i) => i + 1).map(h => (
                <button
                  key={h}
                  type="button"
                  className={`hour-pill ${hours === h ? 'active' : ''}`}
                  onClick={() => setHours(h)}
                  disabled={isDisabled}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Skills <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>({selectedSkills.length} selected for each day)</span></label>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: isDisabled ? '#f59e0b' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isDisabled
                ? '⚠️ Skills cannot be changed while automation is running. Stop the automation first.'
                : '📌 Select the skills to be entered for each day. Skills cannot be changed once automation starts.'}
            </p>
            {selectedSkills.length > 0 && (
              <div className="selected-skills" style={{ marginBottom: '0.75rem' }}>
                {selectedSkills.map(skill => (
                  <span key={skill} className="skill-pill">
                    {skill}
                    {!isDisabled && (
                      <button type="button" onClick={() => toggleSkill(skill)}><X size={12} /></button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {selectedSkills.length === 0 && (
              <p style={{ margin: '0 0 0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No skills selected yet.</p>
            )}
            <button
              type="button"
              className="btn-outline"
              disabled={isDisabled}
              onClick={() => setIsSkillModalOpen(true)}
            >
              <Search size={16} />
              Browse & Select Skills ({ALL_SKILLS.length} available)
            </button>
            {isDisabled && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                ⚠️ Skills cannot be changed while automation is running. Stop the automation first.
              </p>
            )}
          </div>
          
          <div className="info-box">
            <p><strong>Note:</strong> The automation will select the first available internship from your dashboard dropdown automatically.</p>
          </div>

          {job && (job.status === 'pending' || job.status === 'processing') && (
            <div className="preview-control" style={{ marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                className={`btn ${showInAppPreview ? 'btn-primary' : 'btn-outline'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setShowInAppPreview(!showInAppPreview)}
              >
                {showInAppPreview ? 'Hide Live Preview' : 'Show Live Preview'}
              </button>
            </div>
          )}

          {!job || (job.status === 'completed' || job.status === 'failed') ? (
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <PlayCircle size={20} style={{ marginRight: '8px' }} />
              {loading ? 'Starting...' : (job ? 'Run Another Task' : 'Start Automation')}
            </button>
          ) : (
            <button type="button" className="btn btn-danger" onClick={cancelAutomation}>
              <StopCircle size={20} style={{ marginRight: '8px' }} />
              Stop Automation
            </button>
          )}

        </form>

        {job && (
          <div className="status-container">
            <div className="status-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {renderStatusIcon()}
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Task Status</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {(job.totalEntries && job.totalEntries > 0) ? (
                  <span className="progress-badge" style={{ backgroundColor: '#2d3748', color: '#e2e8f0', padding: '4px 12px', borderRadius: '16px', fontSize: '0.875rem', fontWeight: 600 }}>
                    {job.currentEntry || 0} / {job.totalEntries} Entries
                  </span>
                ) : null}
                <span className={`status-badge status-${job.status}`}>
                  {job.status}
                </span>
              </div>
            </div>
            
            <div className="log-viewer">
              {job.logs.map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))}
              {job.logs.length === 0 && <span style={{ opacity: 0.5 }}>Waiting for logs...</span>}
            </div>

            {showInAppPreview && (
              <div className="live-preview-panel">
                <h4>Live Automation View</h4>
                <div className="screenshot-container">
                  {screenshot ? (
                    <img src={`data:image/jpeg;base64,${screenshot}`} alt="VTU Portal Live" />
                  ) : (
                    <div className="screenshot-placeholder">
                      <Loader2 className="animate-spin" />
                      <span>Fetching live view...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
