// ============================================================
// DigiQuest Studio — Database Seed Script
// ============================================================
// Run with: npm run seed
// ============================================================
const { getDb } = require('./database');

async function seed() {
  const db = await getDb();
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  db.exec('DELETE FROM alerts');
  db.exec('DELETE FROM audit_logs');
  db.exec('DELETE FROM briefs');
  db.exec('DELETE FROM clients');

  // Insert Clients
  const clients = [
    ['Zenith Films Pvt Ltd', 'Rajesh Sharma', 'rajesh@zenithfilms.in', '+91-9876543210', 'Film Production', '12 Film City Road, Mumbai 400065'],
    ['BrightStar Advertising', 'Priya Menon', 'priya@brightstarad.com', '+91-9876543211', 'Advertising', '45 MG Road, Bangalore 560001'],
    ['TechVision Corp', 'Arjun Patel', 'arjun@techvisioncorp.com', '+91-9876543212', 'Technology', '789 IT Park, Hyderabad 500081'],
    ['GlobalMedia Networks', 'Sneha Gupta', 'sneha@globalmedia.net', '+91-9876543213', 'Media & Entertainment', '23 Juhu Tara Road, Mumbai 400049'],
    ['CreativeMinds Studio', 'Vikram Singh', 'vikram@creativeminds.in', '+91-9876543214', 'Animation', '56 DLF Cyber City, Gurgaon 122002']
  ];

  const clientIds = [];
  for (const c of clients) {
    const result = db.prepare('INSERT INTO clients (company_name, contact_person, email, phone, industry, address) VALUES (?, ?, ?, ?, ?, ?)').run(...c);
    clientIds.push(result.lastInsertRowid);
    console.log(`  ✅ Client: ${c[0]}`);
  }

  // Insert Briefs
  const briefs = [
    { client_id: clientIds[0], title: 'Zenith Feature Film - The Last Horizon', type: 'film', script: 'INT. VAST DESERT - DAY\nA lone figure walks across endless sand dunes...', references: 'Visual references: Mad Max Fury Road color palette, Blade Runner 2049 landscape shots.', brand: 'Zenith Films standard opening title sequence.', delivery: 'mp4_4k', contacts: '[{"name":"Rajesh Sharma","email":"rajesh@zenithfilms.in","phone":"+91-9876543210","role":"Executive Producer"}]', deadline: '2026-07-15', budget: '15l_50l', requirements: 'VFX heavy production. Need CGI desert landscapes.', status: 'approved', priority: 'high', score: 100 },
    { client_id: clientIds[1], title: 'BrightStar - Summer Campaign TVC 30s', type: 'advertisement', script: 'EXT. ROOFTOP POOL - GOLDEN HOUR\nYoung professionals enjoying summer.', references: 'Reference: Coca-Cola summer campaigns 2024.', brand: 'BrightStar brand guide v3.2: Primary red #E63946.', delivery: 'mp4_1080p', contacts: '[{"name":"Priya Menon","email":"priya@brightstarad.com","phone":"+91-9876543211","role":"Brand Manager"}]', deadline: '2026-06-25', budget: '5l_15l', requirements: 'Need 3 cut-down versions: 30s, 15s, 6s.', status: 'in_production', priority: 'urgent', score: 100 },
    { client_id: clientIds[2], title: 'TechVision Annual Report Video', type: 'corporate', script: 'Corporate video script covering Q4 highlights, CEO message.', references: 'Reference: Google annual reports, Infosys corporate videos.', brand: 'TechVision brand colors: #1A73E8, #34A853.', delivery: 'mp4_1080p', contacts: '[{"name":"Arjun Patel","email":"arjun@techvisioncorp.com","phone":"+91-9876543212","role":"Head of Communications"}]', deadline: '2026-07-01', budget: '1l_5l', requirements: 'Must include data visualization animations.', status: 'under_review', priority: 'normal', score: 100 },
    { client_id: clientIds[3], title: 'GlobalMedia Web Series - Digital Nomads S01', type: 'web_series', script: 'Web series following 4 digital nomads across 6 Asian cities.', references: 'Visual style: Netflix originals meets travel videography.', brand: 'GlobalMedia Networks standard intro (8 seconds).', delivery: 'prores', contacts: '[{"name":"Sneha Gupta","email":"sneha@globalmedia.net","phone":"+91-9876543213","role":"Content Head"}]', deadline: '2026-09-30', budget: 'above_50l', requirements: 'Multi-location shoot across 6 cities. Dubbing in Hindi, Tamil, Telugu.', status: 'submitted', priority: 'high', score: 100 },
    { client_id: clientIds[4], title: 'CreativeMinds - Product Explainer Animation', type: 'animation', script: '2D animation explaining a new SaaS product. 90 seconds.', references: 'Style: Slack, Notion, Figma product videos. Flat design.', brand: 'CreativeMinds palette: #6C63FF, #F5F5F5. Custom mascot Pixel.', delivery: 'mp4_1080p', contacts: '[{"name":"Vikram Singh","email":"vikram@creativeminds.in","phone":"+91-9876543214","role":"Product Manager"}]', deadline: '2026-06-20', budget: '1l_5l', requirements: 'Voiceover in English and Hindi.', status: 'approved', priority: 'urgent', score: 100 },
    { client_id: clientIds[0], title: 'Zenith - Behind the Scenes Documentary', type: 'film', script: 'Behind-the-scenes documentary of The Last Horizon production.', references: '', brand: 'Zenith Films branding. Documentary style.', delivery: 'mp4_4k', contacts: '[{"name":"Rajesh Sharma","email":"rajesh@zenithfilms.in","phone":"+91-9876543210","role":"Executive Producer"}]', deadline: '2026-08-15', budget: '5l_15l', requirements: 'Must sync with main film release.', status: 'draft', priority: 'low', score: 85 },
    { client_id: clientIds[1], title: 'BrightStar - Social Media Content Pack', type: 'advertisement', script: '', references: 'Instagram reels style. Trendy transitions.', brand: 'BrightStar brand guide v3.2. Casual tone.', delivery: 'mp4_1080p', contacts: '[{"name":"Priya Menon","email":"priya@brightstarad.com","phone":"+91-9876543211","role":"Brand Manager"}]', deadline: '2026-06-30', budget: 'under_1l', requirements: '10 short-form videos. Each 15-60 seconds.', status: 'draft', priority: 'normal', score: 65 },
    { client_id: clientIds[2], title: 'TechVision - Product Launch Teaser', type: 'corporate', script: 'Teaser video for new AI product launch. 15 seconds.', references: 'Apple product reveals, OnePlus launch teasers.', brand: '', delivery: 'mov', contacts: '[{"name":"Arjun Patel","email":"arjun@techvisioncorp.com","phone":"+91-9876543212","role":"Head of Communications"}]', deadline: '2026-06-18', budget: '1l_5l', requirements: 'Confidential product — NDA required.', status: 'revision_requested', priority: 'high', score: 80 },
    { client_id: clientIds[3], title: 'GlobalMedia - News Intro Package', type: 'animation', script: '', references: 'CNN, BBC, NDTV news intro packages.', brand: 'GlobalMedia Networks branding. News division colors.', delivery: 'mov', contacts: '[{"name":"Sneha Gupta","email":"sneha@globalmedia.net","phone":"+91-9876543213","role":"Content Head"}]', deadline: '2026-07-10', budget: '5l_15l', requirements: '3D animated package: main intro, lower thirds, transitions.', status: 'submitted', priority: 'normal', score: 65 },
    { client_id: clientIds[4], title: 'CreativeMinds - Brand Film', type: 'corporate', script: 'A 3-minute brand film showcasing CreativeMinds journey.', references: 'HubSpot brand film, Atlassian culture videos.', brand: 'CreativeMinds full brand guide.', delivery: 'mp4_4k', contacts: '[{"name":"Vikram Singh","email":"vikram@creativeminds.in","phone":"+91-9876543214","role":"CEO"}]', deadline: '2026-07-20', budget: '5l_15l', requirements: 'Interview-style with 5 employees and 3 clients.', status: 'under_review', priority: 'normal', score: 100 },
    { client_id: clientIds[0], title: 'Zenith - Hindi Dubbing: Dragon Quest', type: 'dubbing', script: 'Full Hindi dubbing for 12-episode anime series.', references: 'Original Japanese audio provided.', brand: 'Zenith Films dubbing standards.', delivery: 'wav_audio', contacts: '[{"name":"Rajesh Sharma","email":"rajesh@zenithfilms.in","phone":"+91-9876543210","role":"Executive Producer"}]', deadline: '2026-08-01', budget: '5l_15l', requirements: '6 main characters, 12 supporting.', status: 'approved', priority: 'normal', score: 100 },
    { client_id: clientIds[1], title: 'BrightStar - Diwali Campaign VFX', type: 'vfx', script: 'VFX-heavy Diwali campaign: product bottles transform into fireworks.', references: '', brand: '', delivery: 'mp4_4k', contacts: '[]', deadline: null, budget: null, requirements: '', status: 'draft', priority: 'low', score: 15 },
    { client_id: clientIds[3], title: 'GlobalMedia - Post-Production: City Stories', type: 'post_production', script: 'Color grading, sound design, and final editing for 6-part documentary.', references: 'Color reference: Wes Anderson warm palette.', brand: 'GlobalMedia Networks standard end credits.', delivery: 'prores', contacts: '[{"name":"Sneha Gupta","email":"sneha@globalmedia.net","phone":"+91-9876543213","role":"Content Head"}]', deadline: '2026-07-25', budget: '15l_50l', requirements: 'DaVinci Resolve for color grading. Dolby Atmos mix.', status: 'in_production', priority: 'high', score: 100 },
    { client_id: clientIds[4], title: 'CreativeMinds - App Onboarding Video', type: 'animation', script: 'Animated onboarding video for mobile app.', references: 'Duolingo, Headspace onboarding videos.', brand: 'CreativeMinds mobile app style guide.', delivery: 'mp4_1080p', contacts: '[{"name":"Vikram Singh","email":"vikram@creativeminds.in","phone":"+91-9876543214","role":"Product Manager"}]', deadline: '2026-06-28', budget: 'under_1l', requirements: 'Portrait orientation for mobile.', status: 'completed', priority: 'normal', score: 100 },
    { client_id: clientIds[2], title: 'TechVision - Hackathon Highlight Reel', type: 'corporate', script: 'Highlights from TechVision annual hackathon. 3-minute reel.', references: 'Google I/O highlight reels, Microsoft Build recaps.', brand: 'TechVision event branding.', delivery: 'mp4_1080p', contacts: '[{"name":"Arjun Patel","email":"arjun@techvisioncorp.com","phone":"+91-9876543212","role":"Head of Communications"}]', deadline: '2026-06-22', budget: 'under_1l', requirements: 'Quick turnaround needed.', status: 'submitted', priority: 'normal', score: 100 }
  ];

  for (const b of briefs) {
    const result = db.prepare(`
      INSERT INTO briefs (
        client_id, project_title, project_type,
        script_text, references_text, brand_guidelines_text,
        delivery_format, approval_contacts,
        deadline, budget_range, special_requirements,
        status, priority, completeness_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      b.client_id, b.title, b.type,
      b.script || null, b.references || null, b.brand || null,
      b.delivery, b.contacts,
      b.deadline || null, b.budget || null, b.requirements || null,
      b.status, b.priority, b.score
    );

    const briefId = result.lastInsertRowid;
    db.prepare('INSERT INTO audit_logs (brief_id, action, performed_by) VALUES (?, ?, ?)').run(briefId, 'created', 'seed');
    console.log(`  ✅ Brief: ${b.title} [${b.status}]`);
  }

  // Summary
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  const briefCount = db.prepare('SELECT COUNT(*) as count FROM briefs').get();
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();

  console.log('\n────────────────────────────────────────');
  console.log(`✅ Seeding complete!`);
  console.log(`   Clients: ${clientCount.count}`);
  console.log(`   Briefs:  ${briefCount.count}`);
  console.log(`   Audit logs: ${auditCount.count}`);
  console.log('────────────────────────────────────────\n');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
