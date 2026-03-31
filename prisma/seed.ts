import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Events
  const events = [
    // Software & General Tech
    { id: "event-1", title: "Smart India Hackathon 2025", org: "AICTE & MHRD", banner: "🇮🇳", date: "Mar 15 – Mar 17", deadline: "Feb 28", mode: "Offline", city: "Pan India", prize: "₹10,00,000", difficulty: "Advanced", teamSize: "6", category: "Hackathon", tags: ["AI/ML", "GovTech", "Healthcare"], registered: 12400, featured: true },
    { id: "event-2", title: "HackWithInfy 2025", org: "Infosys", banner: "💡", date: "Apr 5 – Apr 6", deadline: "Mar 20", mode: "Online", city: "Remote", prize: "₹5,00,000", difficulty: "Intermediate", teamSize: "3-4", category: "Hackathon", tags: ["Web", "Cloud", "Data"], registered: 8500, featured: false },
    { id: "event-3", title: "CodeChef SnackDown", org: "CodeChef", banner: "🍴", date: "May 10", deadline: "Apr 30", mode: "Online", city: "Remote", prize: "₹2,50,000", difficulty: "Advanced", teamSize: "2", category: "Coding Competition", tags: ["DSA", "Competitive"], registered: 25000, featured: true },
    { id: "event-4", title: "IIT Bombay Techfest", org: "IIT Bombay", banner: "⚗️", date: "Dec 19 – Dec 21", deadline: "Nov 30", mode: "Offline", city: "Mumbai", prize: "₹15,00,000", difficulty: "Intermediate", teamSize: "2-4", category: "Tech Fest", tags: ["Robotics", "AI", "Design"], registered: 6000, featured: false },
    { id: "event-5", title: "Google Developer Challenge", org: "Google", banner: "🔮", date: "Jun 15 – Jun 20", deadline: "May 15", mode: "Hybrid", city: "Bangalore", prize: "₹8,00,000", difficulty: "Intermediate", teamSize: "Solo", category: "Hackathon", tags: ["Android", "Firebase", "Flutter"], registered: 15000, featured: true },
    { id: "event-6", title: "Microsoft Imagine Cup", org: "Microsoft", banner: "🪟", date: "Jul 1 – Jul 3", deadline: "Jun 15", mode: "Online", city: "Remote", prize: "$100,000", difficulty: "Advanced", teamSize: "3", category: "Innovation", tags: ["Azure", "AI", "Cloud"], registered: 9200, featured: false },
    
    // ECE/Electronics Events
    { id: "event-7", title: "IEEE Circuit Design Challenge 2025", org: "IEEE India", banner: "⚡", date: "Apr 20 – Apr 25", deadline: "Apr 10", mode: "Offline", city: "New Delhi", prize: "₹3,00,000", difficulty: "Intermediate", teamSize: "3", category: "Technical Competition", tags: ["Circuit Design", "Electronics", "PCB"], registered: 4200, featured: true },
    { id: "event-8", title: "Wireless Communication Hackathon", org: "Telecom Department", banner: "📡", date: "May 8 – May 10", deadline: "Apr 28", mode: "Offline", city: "Bangalore", prize: "₹2,50,000", difficulty: "Advanced", teamSize: "4", category: "Hackathon", tags: ["5G", "Signal Processing", "Communication"], registered: 2800, featured: false },
    { id: "event-9", title: "Embedded Systems Project Showcase", org: "NIT Council", banner: "🔧", date: "Jun 1 – Jun 3", deadline: "May 20", mode: "Hybrid", city: "Hyderabad", prize: "₹1,80,000", difficulty: "Intermediate", teamSize: "2-3", category: "Showcase", tags: ["Embedded", "IoT", "Microcontrollers"], registered: 3500, featured: false },
    { id: "event-10", title: "Signal Processing Innovation Contest", org: "DSP Society", banner: "〰️", date: "Jul 15 – Jul 20", deadline: "Jul 5", mode: "Online", city: "Remote", prize: "₹2,00,000", difficulty: "Advanced", teamSize: "2", category: "Competition", tags: ["DSP", "MATLAB", "Audio Processing"], registered: 1900, featured: true },
    
    // EEE/Electrical Events
    { id: "event-11", title: "Power Systems Design Challenge", org: "Power Grid India", banner: "⚙️", date: "Mar 25 – Mar 28", deadline: "Mar 15", mode: "Offline", city: "Delhi", prize: "₹4,00,000", difficulty: "Advanced", teamSize: "4-5", category: "Technical Competition", tags: ["Power Systems", "Electrical", "GridTech"], registered: 2200, featured: true },
    { id: "event-12", title: "Renewable Energy Engineering Hackathon", org: "Green Energy Initiative", banner: "🌱", date: "Apr 10 – Apr 12", deadline: "Mar 30", mode: "Hybrid", city: "Pune", prize: "₹3,50,000", difficulty: "Intermediate", teamSize: "4", category: "Hackathon", tags: ["Solar", "Wind", "Sustainable"], registered: 3800, featured: false },
    { id: "event-13", title: "High Voltage Lab Competition", org: "EEE Department", banner: "⚡", date: "May 15 – May 17", deadline: "May 5", mode: "Offline", city: "Chennai", prize: "₹1,50,000", difficulty: "Intermediate", teamSize: "3", category: "Lab Competition", tags: ["HV Testing", "Power Electronics", "Electrical"], registered: 1200, featured: false },
    { id: "event-14", title: "Smart Grid Innovation Summit", org: "Ministry of Power", banner: "🏭", date: "Aug 1 – Aug 5", deadline: "Jul 20", mode: "Offline", city: "Mumbai", prize: "₹5,00,000", difficulty: "Advanced", teamSize: "5", category: "Summit", tags: ["Smart Grid", "IoT", "Energy Management"], registered: 4500, featured: true },
    
    // Mechanical Engineering Events
    { id: "event-15", title: "AutoCAD Design Championship", org: "ME Association", banner: "🏎️", date: "Mar 30 – Apr 2", deadline: "Mar 20", mode: "Hybrid", city: "Bangalore", prize: "₹2,20,000", difficulty: "Intermediate", teamSize: "3", category: "Design Competition", tags: ["CAD", "Mechanical Design", "3D Modeling"], registered: 3600, featured: false },
    { id: "event-16", title: "Robotics & Automation Challenge", org: "Robocon Committee", banner: "🤖", date: "Apr 8 – Apr 15", deadline: "Mar 25", mode: "Offline", city: "Delhi", prize: "₹4,50,000", difficulty: "Advanced", teamSize: "8", category: "Robotics", tags: ["Robotics", "Automation", "Mechanical Design"], registered: 5100, featured: true },
    { id: "event-17", title: "Manufacturing & Machining Contest", org: "Production Dept", banner: "⚙️", date: "May 5 – May 8", deadline: "Apr 25", mode: "Offline", city: "Pune", prize: "₹1,80,000", difficulty: "Intermediate", teamSize: "4", category: "Workshop", tags: ["CNC", "Machining", "Manufacturing"], registered: 900, featured: false },
    { id: "event-18", title: "Efficiency Challenge: Thermal Design", org: "ASME", banner: "🔥", date: "Jun 10 – Jun 15", deadline: "May 30", mode: "Hybrid", city: "Hyderabad", prize: "₹2,50,000", difficulty: "Advanced", teamSize: "4", category: "Engineering Competition", tags: ["Thermal", "Engine Design", "CFD"], registered: 1500, featured: false },
    
    // Civil Engineering Events
    { id: "event-19", title: "Structural Design & Sustainability Hackathon", org: "Civil Engineering Board", banner: "🏗️", date: "Apr 18 – Apr 20", deadline: "Apr 8", mode: "Hybrid", city: "Bangalore", prize: "₹2,80,000", difficulty: "Intermediate", teamSize: "4", category: "Hackathon", tags: ["Structural Engineering", "Sustainability", "BIM"], registered: 2400, featured: true },
    { id: "event-20", title: "Model Bridge Building Competition", org: "ASCE Student Chapter", banner: "🌉", date: "May 12 – May 14", deadline: "May 1", mode: "Offline", city: "Mumbai", prize: "₹1,60,000", difficulty: "Intermediate", teamSize: "5", category: "Competition", tags: ["Structural", "Bridge Design", "Hands-on"], registered: 1800, featured: false },
    { id: "event-21", title: "Urban Planning & Smart Cities Challenge", org: "Urban Development Dept", banner: "🏙️", date: "Jun 5 – Jun 10", deadline: "May 25", mode: "Online", city: "Remote", prize: "₹3,20,000", difficulty: "Intermediate", teamSize: "4-5", category: "Design Challenge", tags: ["Urban Planning", "Sustainability", "GIS"], registered: 2100, featured: false },
    { id: "event-22", title: "Foundation Engineering Case Study Competition", org: "Geotechnical Society", banner: "🏔️", date: "Jul 10 – Jul 13", deadline: "Jun 30", mode: "Offline", city: "Delhi", prize: "₹1,40,000", difficulty: "Advanced", teamSize: "3", category: "Competition", tags: ["Geotechnical", "Foundation", "Soil Mechanics"], registered: 950, featured: false },
    
    // Non-Technical Events
    { id: "event-23", title: "Business Model Innovation Canvas Challenge", org: "Entrepreneurship Cell", banner: "💼", date: "Mar 20 – Mar 23", deadline: "Mar 10", mode: "Online", city: "Remote", prize: "₹1,80,000", difficulty: "Easy", teamSize: "4", category: "Business Competition", tags: ["Startup", "Business Model", "Innovation"], registered: 8900, featured: true },
    { id: "event-24", title: "Case Study Management Competition", org: "Management Forum", banner: "📊", date: "Apr 15 – Apr 18", deadline: "Apr 5", mode: "Hybrid", city: "Delhi", prize: "₹2,00,000", difficulty: "Intermediate", teamSize: "3-4", category: "Management", tags: ["Strategy", "Case Analysis", "Leadership"], registered: 4200, featured: false },
    { id: "event-25", title: "Design Thinking Workshop & Pitching Event", org: "Innovation Hub", banner: "🎨", date: "May 1 – May 3", deadline: "Apr 20", mode: "Offline", city: "Bangalore", prize: "₹1,50,000", difficulty: "Easy", teamSize: "3-5", category: "Workshop", tags: ["Design", "Innovation", "Pitching"], registered: 5600, featured: true },
    { id: "event-26", title: "Marketing & Social Media Challenge", org: "Marketing Club", banner: "📱", date: "May 20 – May 25", deadline: "May 10", mode: "Online", city: "Remote", prize: "₹90,000", difficulty: "Easy", teamSize: "2-3", category: "Marketing", tags: ["Social Media", "Content Creation", "Digital Marketing"], registered: 6200, featured: false },
    { id: "event-27", title: "Entrepreneurship Pitch Competition", org: "StartUp India", banner: "🚀", date: "Jun 8 – Jun 10", deadline: "May 28", mode: "Offline", city: "Mumbai", prize: "₹4,00,000", difficulty: "Intermediate", teamSize: "3-4", category: "Business", tags: ["Startups", "Pitching", "Funding"], registered: 3400, featured: true },
    { id: "event-28", title: "Financial Modeling & Investment Case Competition", org: "Finance Club", banner: "💰", date: "Jul 5 – Jul 8", deadline: "Jun 25", mode: "Hybrid", city: "Delhi", prize: "₹1,70,000", difficulty: "Advanced", teamSize: "3", category: "Finance", tags: ["Finance", "Modeling", "Investment"], registered: 1600, featured: false },
  ];

  for (const event of events) {
    const { id, ...eventData } = event;
    await prisma.event.upsert({
      where: { id },
      update: eventData,
      create: { id, ...eventData },
    });
  }

  // Seed Challenges
  const challenges = [
    { id: "challenge-1", title: "Two Sum", difficulty: "Easy", acceptance: 87, tags: ["Array", "Hash Map"], submissions: "10.2M" },
    { id: "challenge-2", title: "Longest Palindrome Substring", difficulty: "Medium", acceptance: 32, tags: ["String", "DP"], submissions: "2.1M" },
    { id: "challenge-3", title: "Merge K Sorted Lists", difficulty: "Hard", acceptance: 18, tags: ["Linked List", "Heap"], submissions: "850K" },
    { id: "challenge-4", title: "Valid Parentheses", difficulty: "Easy", acceptance: 65, tags: ["Stack", "String"], submissions: "5.4M" },
    { id: "challenge-5", title: "Binary Tree Level Order", difficulty: "Medium", acceptance: 45, tags: ["Tree", "BFS"], submissions: "3.2M" },
    { id: "challenge-6", title: "Word Break", difficulty: "Medium", acceptance: 28, tags: ["DP", "Trie"], submissions: "1.8M" },
    { id: "challenge-7", title: "N-Queens", difficulty: "Hard", acceptance: 12, tags: ["Backtracking"], submissions: "420K" },
    { id: "challenge-8", title: "Container With Most Water", difficulty: "Medium", acceptance: 51, tags: ["Array", "Two Pointer"], submissions: "2.9M" },
  ];

  for (const challenge of challenges) {
    const { id, ...challengeData } = challenge;
    await prisma.challenge.upsert({
      where: { id },
      update: challengeData,
      create: { id, ...challengeData },
    });
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
