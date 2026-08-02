(function () {
  var E = {};
  window.AQUA_EN_L10N = E;

  E['act-rowing'] = {
    name: 'Rowing', tagline: 'Build technique, strength and crew.',
    short: 'Learn technique, balance and endurance with certified coaches on professional rowing shells.',
    long: 'Rowing is why Aqua Ludo exists. Our team of certified coaches will get you on the water and make your first stroke a good one from session one. We work in progressive groups — On Boarding for beginners, Foundation for the curious, Performance for athletes, and Elite for our competitive squad. All equipment is on us, and our stretch of the Nile is one of the calmest, safest places to learn in Cairo.',
    pricing: [
      { name: 'On Boarding', desc: 'Mandatory intro session for all beginners.', price: 200, duration: '1 hour' },
      { name: 'Foundation', desc: 'Build the base. Stroke after stroke.', price: 200, duration: '1 hour' },
      { name: 'Performance', desc: 'For the dedicated. Power, speed, technique.', price: 200, duration: '1 hour' },
      { name: 'Elite', desc: 'High-intensity competitive rowing.', price: 200, duration: '1 hour' },
      { name: 'Private 1-on-1', desc: 'Personal coaching, just you and a coach.', price: 400, duration: '1 hour' }
    ],
    included: ['Boat and oars', 'Coach on the water with you', 'Life jacket', 'Bottled water'],
    bring: ['Swimwear or quick-dry clothing', 'Sunscreen', 'Towel', 'Sandals that can get wet']
  };

  E['act-kayaking'] = {
    name: 'Kayaking', tagline: 'Cruise the Nile.',
    short: 'Explore the Nile on fun or training kayak sessions with coach supervision.',
    long: 'There is nothing like sitting a few centimetres above the water in a kayak, gliding past the city. Our sessions split between "Kayaking for Fun" — the easiest way to fall in love with the sport — and "Flatwater Training" for those who want technique and endurance, and who want to join our weekly paddlers group on the Nile.',
    pricing: [
      { name: 'Kayaking for Fun', desc: 'Recreational kayaking on the Nile for everyone.', price: 130, duration: '1 hour' },
      { name: 'Flatwater Training', desc: 'Technique and endurance.', price: 120, duration: '1 hour' }
    ],
    included: ['Single or double kayak', 'Paddle and life jacket', 'Coach-supervised route', 'Bottled water'],
    bring: ['Swimwear or quick-dry clothing', 'Sunscreen', 'Towel', 'Change of clothes']
  };

  E['act-sup'] = {
    name: 'Stand-Up Paddle (SUP)', tagline: 'Balance and core.',
    short: 'Strengthen your core and balance and enjoy standing on the water in our sunrise and sunset sessions.',
    long: 'SUP is the easiest sport to start. Ten minutes after stepping on the board for the first time you will take your first good stroke. We run sunrise and sunset sessions on the calmest stretch of the Nile, and our coaches are great at getting beginners up and paddling fast.',
    pricing: [
      { name: 'SUP Session', desc: 'An hour on the water with a coach.', price: 350, duration: '1 hour' },
      { name: 'Sunset SUP', desc: 'Our most popular session. Golden hour on the Nile.', price: 350, duration: '1 hour' }
    ],
    included: ['Board and paddle', 'Coach on the water', 'Life jacket', 'Photos from your session'],
    bring: ['Swimwear or quick-dry clothing', 'Sunscreen', 'Towel', 'Change of clothes']
  };

  E['act-wakeboard'] = {
    name: 'Wakeboard', tagline: 'Pure adrenaline.',
    short: 'Boat-tow sessions for riders who want to jump and cut across the Nile waves.',
    long: 'Our wakeboarding runs behind a real ski boat, with a coach in the water with you for your first rides. Beginners start with a longer rope and progress fast. We have the gear, the boat, and the patience. All you need is a bit of courage and a willingness to get wet.',
    pricing: [
      { name: 'Beginner Wakeboard', desc: 'Your first rides behind the boat. We start you on a longer rope.', price: 1800, duration: '30 min' },
      { name: 'Pro Wakeboard', desc: 'Cuts, jumps and tricks. For advanced riders.', price: 1800, duration: '30 min' }
    ],
    included: ['Boat and driver', 'Board and life jacket', 'Helmet', 'Coach in the water with you'],
    bring: ['Swimwear', 'Sunscreen', 'Towel', 'Change of clothes', 'Waterproof phone case if you have one']
  };

  E['act-fitness'] = {
    name: 'On-Water Fitness', tagline: 'Stronger every day.',
    short: 'Strength, endurance and mobility designed for water sports and an active lifestyle.',
    long: 'Our fitness programme is built by rowers, for everyone. Strength and conditioning designed for the water sports you love — a stronger back, better posture, faster recovery. We mix bodyweight work, bands and group drills. The group feels like a team sport, and private sessions are tailored to your goals.',
    pricing: [
      { name: 'Group Fitness', desc: 'Group session outdoors. All levels.', price: 150, duration: '1 hour' },
      { name: 'Personal Training', desc: '1-on-1 tailored to you.', price: 400, duration: '1 hour' }
    ],
    included: ['All equipment', 'Coach-led session', 'Water', 'Recovery and stretching'],
    bring: ['Trainers or sports shoes', 'Towel', 'Water bottle', 'Positive energy']
  };

  E['evt-runrow'] = {
    title: 'Run & Row Challenge',
    time: '07:30 — 10:30 AM',
    location: 'Aqua Ludo, Dokki',
    tagline: 'Push yourself on land and water. One challenge. Two sports. Ready?',
    body: 'Ready to test yourself? Join Aqua Ludo for an energetic fitness challenge combining running endurance and rowing power. Whether you are new to sport or an experienced athlete, the Run & Row Challenge is designed to test your strength, grit and teamwork in a fun, supportive atmosphere.',
    audience: 'Open to everyone'
  };

  E['evt-sunset'] = {
    title: 'Sunset SUP on the Nile',
    time: '06:00 — 08:00 PM',
    location: 'Aqua Ludo, Dokki',
    tagline: 'An SUP evening, golden hour, and the city lights coming on.',
    body: 'There is nothing better than spending your weekend in Cairo on the water at sunset. Bring a friend, paddle with us on the Nile, and watch the city light up. Coaches and music on the water, photos included.',
    audience: 'Open to everyone'
  };

  E['evt-regatta'] = {
    title: 'Nationals Regatta 2026',
    time: '07:00 — 11:00 AM',
    location: 'Aqua Ludo, Dokki',
    tagline: 'Our pro rowers take on all of Egypt.',
    body: 'The biggest day on our calendar. Our Elite and Performance rowers race the best athletes in the country, on the water they have trained on for years. Come race, come cheer, come see the future of rowing in Egypt.',
    audience: 'Members only'
  };

  E['evt-iftar'] = {
    title: 'Community Iftar on the Nile',
    time: '07:00 — 11:00 PM',
    location: 'Aqua Ludo, Dokki',
    tagline: 'Break your fast with the team, on the water, under the city lights.',
    body: 'Our annual iftar. Bring your family, friends and an empty stomach. The Aqua Ludo team will be on the water with lanterns, food and the warmest welcome in Cairo.',
    audience: 'Open to everyone'
  };

  E['pkg-starter'] = {
    name: 'Starter', scope: '1 session',
    desc: 'A single one-hour session on any activity. Perfect for your first time on the water.',
    benefits: ['One-hour session', 'All equipment on us', 'Coach with you on the water', 'Any day of the week']
  };

  E['pkg-crew'] = {
    name: 'Crew Package', scope: '9 sessions',
    desc: '8 sessions, plus 1 bonus. The fastest way to actually get good at something on the water.',
    benefits: ['9 sessions total (1 on us)', 'Use them on any activity', 'Valid for 3 months', 'Aqua Ludo cap and bottle as a gift', 'Booking priority'],
    badge: 'Most loved'
  };

  E['pkg-unlimited'] = {
    name: 'Unlimited', scope: 'monthly',
    desc: 'Train every day. Best for our rowers and anyone who falls in love from day one.',
    benefits: ['Unlimited sessions all month', 'Weekly group training', '10% off events and trips', 'Personal training plan', 'Members WhatsApp group']
  };

  E['mem-bronze'] = {
    name: 'Bronze', scope: 'monthly',
    desc: '4 sessions a month. A light commitment.',
    benefits: ['4 sessions a month', 'Any activity', 'Members-only events', 'Free water']
  };

  E['mem-silver'] = {
    name: 'Silver', scope: 'monthly',
    desc: '8 sessions a month. Our best seller.',
    benefits: ['8 sessions a month', 'Any activity', '10% off wakeboard', 'Monthly progress review', 'Aqua Ludo gear as a gift'],
    badge: 'Best value'
  };

  E['mem-gold'] = {
    name: 'Gold', scope: 'monthly',
    desc: 'Everything unlimited. For our most committed members.',
    benefits: ['Unlimited sessions', 'Unlimited events', 'Personal coach on WhatsApp', 'Quarterly goal review', 'Bring a friend twice a month']
  };

  E['coach-1'] = { name: 'Youssef El-Sayed', role: 'Head Coach · Rowing', bio: 'More than 10 years on the Nile. Coached athletes who went on to compete at national level.' };
  E['coach-2'] = { name: 'Salma Hany', role: 'Coach · Kayaking & SUP', bio: 'Calm and clear, brilliant with beginners. Her first session will feel like a hundred.' };
  E['coach-3'] = { name: 'Omar Farouk', role: 'Coach · Wakeboard', bio: 'A champion wakeboarder. Lives for the moment you stand on the board for the first time.' };
  E['coach-4'] = { name: 'Nour Hassan', role: 'Coach · Fitness', bio: 'A strength coach who tailors every programme to the water sport you love.' };

  E['reviews'] = [
    { activitySlug: 'rowing', author: 'سلمى عقل', authorEn: 'Salma Akl', body: 'Rowing here has become my therapy. The coaches are supportive and the Nile is something else at sunrise.' },
    { activitySlug: 'rowing', author: 'فريدة محمد', authorEn: 'Farida Mohamed', body: 'The best decision I made in Cairo. A real community and real coaching.' },
    { activitySlug: 'kayaking', author: 'أندرو عزت', authorEn: 'Andrew Ezzat', body: 'Highly recommend the kayaking sessions. Very safe, the team is lovely, and they explain everything.' },
    { activitySlug: 'sup', author: 'سلمى ع.', authorEn: 'Salma A.', body: 'The sunset SUP session was magical. The golden hour on the Nile is unreal. Highly recommended.' },
    { activitySlug: 'wakeboard', author: 'عمر ع.', authorEn: 'Omar A.', body: 'So much fun. The coach was patient with my first falls and I stood up by the end. Five stars.' },
    { activitySlug: 'fitness', author: 'نور م.', authorEn: 'Nour M.', body: 'The best hour of my week. Great energy, great coaching, and I got stronger in a month.' }
  ];
})();
