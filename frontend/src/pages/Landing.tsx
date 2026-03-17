import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Globe,
  Command,
  ChevronLeft,
  ChevronRight,
  Layout,
  History,
  Lock,
  Zap,
  MousePointerClick,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Components ---

const Navbar = () => {
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(scrollY, [0, 50], ['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']);
  const borderColor = useTransform(scrollY, [0, 50], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.1)']);

  return (
    <motion.nav 
      style={{ backgroundColor, borderColor }}
      className="fixed top-0 left-0 right-0 z-[100] border-b backdrop-blur-md transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F4FF1] to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Command className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">FinLedger<span className="text-[#4F4FF1]">Pro</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          {['Features', 'About'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#4F4FF1] transition-all group-hover:w-full" />
            </a>
          ))}
          <a 
            href="#contact"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors relative group"
          >
            Contact
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#4F4FF1] transition-all group-hover:w-full" />
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
            Login
          </Link>
          <Link 
            to="/login"
            className="px-6 py-2 bg-[#4F4FF1] text-white rounded-full text-sm font-bold hover:bg-[#3F3FE1] transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

const LogoMarquee = () => {
  const logos = [
    { name: 'Amarican Express', url: 'https://framerusercontent.com/images/78RDxdPZQj6H09VhjI8TL2cMw.svg' },
    { name: 'Gpay', url: 'https://framerusercontent.com/images/t34Fn3dNyrGlvRfvS39PtqXUw.svg' },
    { name: 'Klarna', url: 'https://framerusercontent.com/images/uA1ugLaIygee5kiOoKaYPlMEQ0.svg' },
    { name: 'Mastercard', url: 'https://framerusercontent.com/images/A7ezHVT9V3RFn5voZqAfl52Fso.svg' },
    { name: 'OpenSea', url: 'https://framerusercontent.com/images/tpuzTMam7subVkUGwXOAbhw3I.svg' },
    { name: 'Samsung', url: 'https://framerusercontent.com/images/Kqvvfk1k2Nv2ypGBXi1Yf311oRc.svg' },
    { name: 'Shop Pay', url: 'https://framerusercontent.com/images/AWRpoEVqEDIGbL9q67JwrTb17Q.svg' }
  ];

  return (
    <div className="py-20 overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black to-transparent z-10" />
      
      <motion.div 
        animate={{ x: [0, -1800] }}
        transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
        className="flex whitespace-nowrap gap-32 items-center opacity-30 px-10"
      >
        {[...logos, ...logos, ...logos].map((logo, i) => (
          <img key={i} src={logo.url} alt={logo.name} className="h-10 grayscale brightness-200" />
        ))}
      </motion.div>
    </div>
  );
};

const FadeInView = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);



const ProcessStep = ({ number, title, desc, delay }: any) => (
  <FadeInView delay={delay}>
    <div className="relative group p-10 glass-card h-full flex flex-col items-start overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 text-[8rem] font-black italic opacity-[0.03] select-none group-hover:opacity-[0.06] transition-opacity">
        {number}
      </div>
      <div className="w-12 h-12 rounded-full bg-[#4F4FF1]/20 flex items-center justify-center mb-8 group-hover:bg-[#4F4FF1] transition-all duration-500">
        <Zap className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-white/40 leading-relaxed">{desc}</p>
    </div>
  </FadeInView>
);

const InteractiveBentoGrid = () => {
  const features = [
    {
      title: "Multi-Tenant Financial Core",
      desc: "Comprehensive dashboards with real-time consolidation across multiple entities.",
      image: "/feat-multi-tenant.png",
      className: "md:col-span-2 md:row-span-2",
      icon: Layout,
      delay: 0.1
    },
    {
      title: "AI-Driven Intelligence",
      desc: "Advanced AI insights that identify anomalies and spending optimizations.",
      image: "/feat-ai-insights.png",
      className: "md:col-span-1 md:row-span-1",
      icon: Sparkles,
      delay: 0.2
    },
    {
      title: "Interactive Budgets",
      desc: "Utilization tracking with automated burn rate warnings and real-time visualization.",
      image: "/feat-budgets.png",
      className: "md:col-span-1 md:row-span-1",
      icon: Monitor,
      delay: 0.3
    },
    {
      title: "NL Query & Analytics",
      desc: "Natural language chat commands to configure dynamic pivot tables instantly.",
      image: "/feat-pivot.png",
      className: "md:col-span-2 md:row-span-1",
      icon: MousePointerClick,
      delay: 0.4
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
      {features.map((f, i) => (
        <FadeInView key={i} delay={f.delay}>
          <motion.div
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            className={cn(
              "glass-card group relative overflow-hidden flex flex-col h-[400px] md:h-full border-white/5",
              f.className
            )}
          >
            <div className="p-10 relative z-20">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[#4F4FF1]/20 transition-all duration-500">
                <f.icon className="w-6 h-6 text-white/40 group-hover:text-[#4F4FF1] group-hover:scale-110 transition-all" />
              </div>
              <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{f.title}</h3>
              <p className="text-white/40 leading-relaxed text-sm max-w-sm">{f.desc}</p>
            </div>
            
            <div className="absolute inset-0 z-0">
               <motion.img 
                 src={f.image} 
                 alt={f.title}
                 className="w-full h-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-1000 opacity-60 group-hover:opacity-100"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Shine effect on hover */}
            <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(79,79,241,0.15),transparent_70%)]" />
          </motion.div>
        </FadeInView>
      ))}
    </div>
  );
};

const Testimonials = () => {
  const [active, setActive] = useState(0);
  const data = [
    {
      text: "FinLedger Pro changed how I see my money. The AI dashboards help me spot spending patterns I never noticed before, and I’ve already saved ₹25,000 in just three months.",
      author: "Vikram Malhotra",
      role: "Investment Analyst",
      img: "https://framerusercontent.com/images/4rZfCpTFsp5kQFlrcWkNBCkL9o.png"
    },
    {
      text: "As a business owner, the P&L engine is a lifesaver. I can track profitability by department and vendor in real-time. Absolute clarity for my enterprise scale.",
      author: "Sneha Reddy",
      role: "Founder, GreenRoot Tech",
      img: "https://framerusercontent.com/images/fmRLwPSTkAP63rcf06TTiS1xA.png"
    },
    {
      text: "The natural language query bar is like having a financial analyst in my pocket. I just ask 'What's my burn rate vs budget' and it gives me the exact answer instantly.",
      author: "Rajiv Batra",
      role: "Strategic CFO",
      img: "https://framerusercontent.com/images/MBLonMAM2kYQDifASdwe2UasQ7M.png"
    }
  ];

  const next = () => setActive((prev) => (prev + 1) % data.length);
  const prev = () => setActive((prev) => (prev - 1 + data.length) % data.length);

  return (
    <section id="testimonials" className="py-40 px-6 bg-gradient-to-b from-black to-[#050505]">
      <div className="max-w-7xl mx-auto text-center">
        <FadeInView>
           <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-24 italic">What Our <span className="text-white/20">Users Say</span></h2>
        </FadeInView>

        <div className="relative h-[600px] flex items-center justify-center">
           <AnimatePresence mode="wait">
              <motion.div 
                key={active}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-5xl glass-card p-20 relative z-10"
              >
                 <div className="text-2xl md:text-3xl font-medium leading-tight italic mb-12">
                   "{data[active].text}"
                 </div>
                 <div className="flex items-center justify-center gap-6">
                    <img src={data[active].img} alt={data[active].author} className="w-16 h-16 rounded-full object-cover border-2 border-[#4F4FF1]" />
                    <div className="text-left">
                       <div className="font-bold text-xl">{data[active].author}</div>
                       <div className="text-white/30 text-sm uppercase tracking-widest">{data[active].role}</div>
                    </div>
                 </div>
              </motion.div>
           </AnimatePresence>

           <div className="absolute bottom-0 flex gap-8">
              <button onClick={prev} className="w-16 h-16 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"><ChevronLeft className="w-6 h-6" /></button>
              <button onClick={next} className="w-16 h-16 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-all"><ChevronRight className="w-6 h-6" /></button>
           </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="pt-32 pb-16 px-6 border-t border-white/5 bg-[#030405]">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-16 mb-24">
        <div className="col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#4F4FF1] flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Command className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight uppercase">FinLedgerPro</span>
          </div>
          <p className="text-white/50 max-w-sm mb-10 text-xl font-medium leading-relaxed">
            The most advanced financial intelligence platform for the modern era.
          </p>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full glass border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Globe className="w-5 h-5 text-white/40" /></div>
            <div className="w-12 h-12 rounded-full glass border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Globe className="w-5 h-5 text-white/40" /></div>
          </div>
        </div>
        <div>
          <h5 className="font-bold mb-8 text-xs uppercase tracking-[0.3em] text-white/40">Product</h5>
          <ul className="space-y-4 text-white/60 text-[15px] font-medium">
            <li className="hover:text-[#4F4FF1] cursor-pointer transition-colors">Features</li>
            <li className="hover:text-[#4F4FF1] cursor-pointer transition-colors">Integrations</li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold mb-8 text-xs uppercase tracking-[0.3em] text-white/40">Company</h5>
          <ul className="space-y-4 text-white/60 text-[15px] font-medium">
            <li className="hover:text-[#4F4FF1] cursor-pointer transition-colors">About</li>
            <li className="hover:text-[#4F4FF1] cursor-pointer transition-colors">Contact</li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold mb-8 text-xs uppercase tracking-[0.3em] text-white/40">Resources</h5>
          <ul className="space-y-4 text-white/60 text-[15px] font-medium">
            <li className="hover:text-[#4F4FF1] cursor-pointer transition-colors">Documentation</li>
            <li className="hover:text-[#4F4FF1] cursor-pointer transition-colors">Help Center</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-8">
        <p className="text-white/20 text-[11px] tracking-[0.5em] font-black uppercase">
          © 2026 FinLedgerPro. Designed for High-Growth.
        </p>
        <div className="flex gap-10 text-[11px] text-white/20 font-black uppercase tracking-[0.5em]">
         <span className="hover:text-white cursor-pointer transition-colors">Status</span>
         <span className="hover:text-white cursor-pointer transition-colors">Security</span>
        </div>
      </div>
    </div>
  </footer>
);

// --- Page Component ---

const InteractiveDashboard = () => {
   const x = useMotionValue(0);
   const y = useMotionValue(0);

   const mouseXSpring = useSpring(x);
   const mouseYSpring = useSpring(y);

   const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["18deg", "6deg"]);
   const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const xPct = mouseX / width - 0.5;
      const yPct = mouseY / height - 0.5;
      x.set(xPct);
      y.set(yPct);
   };

   const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
   };

   return (
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ perspective: "2000px" }}
        className="relative group max-w-5xl mx-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="absolute -inset-10 bg-[#4F4FF1]/10 rounded-full blur-[100px] -z-10 opacity-30 group-hover:opacity-50 transition-opacity" />
        <motion.div 
          style={{ 
             rotateX, 
             rotateY, 
             transformStyle: "preserve-3d" 
          }}
          className="relative glass border border-white/10 rounded-[40px] overflow-hidden p-3 bg-[#080808]/90 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]"
        >
          <img 
            src="/hero-dashboard.png" 
            alt="FinLedger Pro Dashboard"
            className="w-full h-auto rounded-[30px] transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
           
          {/* Shine effect that follows mouse */}
          <motion.div
            style={{
               background: useTransform(
                  [mouseXSpring, mouseYSpring],
                  ([x, y]: any) => `radial-gradient(600px circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.08), transparent)`
               )
            }}
            className="absolute inset-0 pointer-events-none"
          />
        </motion.div>
      </motion.div>
   );
};

const Landing: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#4F4FF1]/20 relative overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section id="hero" className="relative pt-[200px] pb-32 px-6 overflow-hidden text-center">
        {/* Spotlight Effect */}
        <div 
          className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(1000px circle at ${mousePos.x}px ${mousePos.y}px, rgba(79, 79, 241, 0.12), transparent 40%)`
          }}
        />
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] aspect-square bg-[#0c0c0c] rounded-full blur-[120px] -z-10" />
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-full h-[1000px] bg-[#4F4FF1]/10 rounded-full blur-[160px] -z-10" />

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full glass mb-12 border border-white/10 text-xs font-bold text-white backdrop-blur-2xl bg-gradient-to-r from-white/10 to-transparent"
          >
            AI-Driven Financial Clarity
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] mb-12 max-w-6xl mx-auto"
          >
            Money moves <br /> 
            <span className="text-gradient">smarter with you</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-white/40 max-w-4xl mx-auto mb-16 font-medium leading-relaxed"
          >
            Manage, track, and grow your finances with ease. Built to empower every kind of user—beginners to pros alike.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-12 mb-32"
          >
            <Link to="/login" className="px-10 py-5 bg-[#4F4FF1] text-white rounded-full font-black text-lg hover:bg-[#3F3FE1] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-blue-500/40 flex items-center gap-4">
              Get Started <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><ArrowRight className="w-5 h-5 text-[#4F4FF1]" /></div>
            </Link>
            <div className="flex items-center gap-5">
               <div className="flex -space-x-5">
                  {[1, 2, 3].map((i) => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-white/10 overflow-hidden relative group">
                        <img src={`https://framerusercontent.com/images/${i === 1 ? 'PizVEIU6p81RyFs6h69AueJvvnI' : i === 2 ? 'oG3KxLvLkcKhrYG2zvVh2OOKsw' : 'MBLonMAM2kYQDifASdwe2UasQ7M'}.png`} alt="avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                     </div>
                  ))}
               </div>
               <div className="text-left font-black tracking-tight">
                  <div className="text-2xl leading-none">+ 20K</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1">Trusted Customers</div>
               </div>
            </div>
          </motion.div>

          <InteractiveDashboard />
        </div>
      </section>

      <LogoMarquee />

      {/* Primary Features */}
      <section id="features" className="py-40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 max-w-5xl mx-auto font-black italic">
             <FadeInView>
               <h2 className="text-4xl md:text-6xl tracking-tighter leading-[0.9] mb-12">
                Transform Your Finances with <br />
                <span className="text-white/20">Advanced Intelligence</span>
               </h2>
               <p className="text-lg md:text-xl text-white/40 font-medium leading-relaxed max-w-4xl mx-auto not-italic">
                 Harness the power of precision-engineered tools to analyze spending and uncover growth.
               </p>
             </FadeInView>
          </div>

          <InteractiveBentoGrid />
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-40 px-6 border-t border-white/5 bg-[#030303]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 max-w-4xl mx-auto font-black italic">
            <FadeInView>
              <h2 className="text-5xl md:text-7xl tracking-tighter leading-[0.9] mb-10">Your Financial Journey, <span className="text-white/20">Simplified in 3 Steps</span></h2>
            </FadeInView>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProcessStep 
              number="01" 
              title="Connect Your Accounts" 
              desc="Securely link your bank, ERP, and investment portfolios to get a unified 360° financial view." 
              delay={0.1} 
            />
            <ProcessStep 
              number="02" 
              title="Get AI Insights" 
              desc="Our advanced AI model breaks down your data and surfaces anomalies that actually matter." 
              delay={0.2} 
            />
            <ProcessStep 
              number="03" 
              title="Take Strategic Action" 
              desc="Receive tailored recommendations for budget management and profitable reallocation." 
              delay={0.3} 
            />
          </div>
        </div>
      </section>

      {/* Capability Highlights */}
      <section id="features-2" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Lock, label: "Secure Access", sub: "AES-256 Encryption" },
              { icon: History, label: "Audit Logs", sub: "Chronological Tracking" },
              { icon: Layout, label: "RBAC", sub: "Granular Visibility" },
              { icon: Zap, label: "Instant Ratios", sub: "20+ Dynamic KPIs" },
            ].map((cap, i) => (
              <FadeInView key={i} delay={i * 0.1}>
                <div className="p-6 text-center group">
                  <cap.icon className="w-8 h-8 text-white/20 group-hover:text-[#4F4FF1] transition-all mx-auto mb-4" />
                  <div className="font-bold text-sm uppercase tracking-widest">{cap.label}</div>
                  <div className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mt-1">{cap.sub}</div>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* The Vision Section */}
      <section id="vision" className="py-40 px-6 relative overflow-hidden bg-black flex justify-center items-center">
         <div className="w-full max-w-6xl mx-auto">
            <FadeInView>
               <div className="group relative w-full">
                  {/* Glowing background */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#4F4FF1] via-purple-500 to-[#00FFFF] rounded-[40px] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
                  
                  {/* Interactive Card */}
                  <div className="relative glass border border-white/10 rounded-[40px] p-12 md:p-24 overflow-hidden shadow-2xl transition-transform duration-1000 group-hover:scale-[1.01] bg-black/60 relative flex flex-col items-center">
                     
                     {/* Background Icon */}
                     <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-1000 pointer-events-none">
                        <Globe className="w-[600px] h-[600px] text-white" />
                     </div>
                     
                     <div className="relative z-10 flex flex-col items-center text-center space-y-12">
                        <div className="inline-block px-8 py-3 rounded-full glass border border-white/10 uppercase tracking-[0.4em] text-[#4F4FF1] text-xs font-black">
                           The Vision
                        </div>
                        
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] italic text-white/90">
                           Bridging the gap between <br />
                           <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F4FF1] via-purple-500 to-[#00FFFF]">Data & Strategy.</span>
                        </h2>
                        
                        <p className="max-w-4xl mx-auto text-xl md:text-3xl text-white/50 font-medium leading-relaxed italic">
                           "Financial intelligence isn't just about reading reports—it's about foreseeing the future of your enterprise through the lens of precision and AI-driven insights."
                        </p>

                        <div className="pt-8 flex flex-col items-center justify-center gap-2">
                           <div className="text-2xl font-black uppercase tracking-widest text-white">CA Aarushi Gupta</div>
                           <div className="text-[#4F4FF1] font-bold uppercase tracking-[0.3em] text-xs">Founder & Visionary</div>
                        </div>

                        <div className="pt-12 flex flex-wrap justify-center gap-4 max-w-4xl">
                           {['Data Integrity', 'Strategic Foresight', 'AI Governance', 'Financial Precision', 'Scale Velocity'].map((tag) => (
                              <span key={tag} className="px-6 py-3 glass border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-[#4F4FF1]/50 hover:bg-[#4F4FF1]/10 hover:shadow-[0_0_30px_rgba(79,79,241,0.2)] transition-all cursor-default">
                                 {tag}
                              </span>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </FadeInView>
         </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="py-32 px-6 relative overflow-hidden bg-black">
         <div className="max-w-7xl mx-auto glass p-20 rounded-[60px] border border-white/10 text-center relative overflow-hidden group">
            <div className="absolute -top-[20rem] -left-[20rem] w-[50rem] h-[50rem] bg-[#4F4FF1]/20 rounded-full blur-[180px] -z-10 group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute -bottom-[20rem] -right-[20rem] w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[180px] -z-10 group-hover:scale-110 transition-transform duration-1000" />
            
            <FadeInView>
               <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-12 leading-[0.85] italic">
                  Build the <br /><span className="text-white/20">Future Today.</span>
               </h2>
               <p className="text-xl md:text-2xl text-white/40 font-medium mb-20 max-w-3xl mx-auto leading-relaxed">
                 Setup takes less than 2 minutes. Start for free, no card required.
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                  <Link to="/login" className="px-12 py-6 bg-white text-black rounded-full font-black text-xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10">
                    Get Started
                  </Link>
                  <button className="px-12 py-6 glass border border-white/20 rounded-full font-black text-xl hover:bg-white/5 transition-all">
                    Talk to Sales
                  </button>
               </div>
            </FadeInView>
         </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
