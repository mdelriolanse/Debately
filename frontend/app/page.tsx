'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useRef } from 'react'
import { Star, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

const SAMPLE_DEBATES = [
  {
    proposition: "Universal basic income would reduce poverty.",
    proArgs: [
      { 
        title: "Safety Net", 
        content: "UBI provides a guaranteed floor, ensuring no one falls into extreme poverty regardless of employment status.",
        votes: 24,
        validityScore: 4,
        factCheck: "Multiple pilot studies in Finland, Kenya, and Stockton CA showed reduced financial stress and improved wellbeing among recipients.",
        sources: ["brookings.edu", "stanford.edu"],
        author: "EconPolicy42"
      },
      { 
        title: "Economic Stimulus", 
        content: "Direct cash transfers boost local economies as recipients spend on necessities, creating a multiplier effect.",
        votes: 19,
        validityScore: 4,
        factCheck: "Studies show low-income households spend 80-100% of additional income locally, compared to 30-40% for high earners.",
        sources: ["clevelandfed.org", "epi.org"],
        author: "Maria Santos"
      }
    ],
    conArgs: [
      { 
        title: "Inflation Risk", 
        content: "Injecting money without increased production could lead to inflation, negating the benefits.",
        votes: 18,
        validityScore: 3,
        factCheck: "Economists remain divided. Some studies suggest targeted transfers have minimal inflation impact, while others warn of price increases in inelastic markets.",
        sources: ["imf.org", "nber.org"],
        author: "MarketSkeptic"
      },
      { 
        title: "Work Disincentive", 
        content: "Guaranteed income may reduce motivation to seek employment or improve skills, lowering overall productivity.",
        votes: 15,
        validityScore: 3,
        factCheck: "Pilot studies show mixed results. Finland found no significant employment change; some US pilots showed modest work hour reductions.",
        sources: ["kela.fi", "nber.org"],
        author: "David Park"
      }
    ]
  },
  {
    proposition: "Remote work should be the default for office jobs.",
    proArgs: [
      { 
        title: "Work-Life Balance", 
        content: "Eliminating commutes gives workers back an average of 40 minutes per day for family, health, and personal development.",
        votes: 31,
        validityScore: 5,
        factCheck: "US Census data confirms average one-way commute of 27.6 minutes. Multiple studies show remote workers report higher job satisfaction.",
        sources: ["census.gov", "gallup.com"],
        author: "Sarah Chen"
      },
      { 
        title: "Environmental Impact", 
        content: "Fewer commuters means reduced carbon emissions, less traffic congestion, and decreased strain on urban infrastructure.",
        votes: 27,
        validityScore: 5,
        factCheck: "Global CO2 emissions dropped 7% in 2020 when remote work surged. Average car commuter produces 4.6 metric tons CO2 annually.",
        sources: ["nature.com", "epa.gov"],
        author: "GreenCommuter"
      }
    ],
    conArgs: [
      { 
        title: "Collaboration Suffers", 
        content: "Spontaneous interactions and creative brainstorming are harder to replicate virtually, potentially reducing innovation.",
        votes: 22,
        validityScore: 4,
        factCheck: "Microsoft study found remote work reduced cross-team collaboration by 25%. However, focused individual work improved.",
        sources: ["microsoft.com", "hbr.org"],
        author: "James Mitchell"
      },
      { 
        title: "Career Progression", 
        content: "Remote workers may miss out on visibility, mentorship, and networking opportunities that drive promotions.",
        votes: 18,
        validityScore: 4,
        factCheck: "Stanford research shows remote workers 50% less likely to be promoted. However, this may reflect bias rather than performance differences.",
        sources: ["stanford.edu", "shrm.org"],
        author: "CareerCoach99"
      }
    ]
  },
  {
    proposition: "Social media has done more harm than good.",
    proArgs: [
      { 
        title: "Mental Health Crisis", 
        content: "Studies link heavy social media use to increased anxiety, depression, and loneliness, especially among teenagers.",
        votes: 45,
        validityScore: 4,
        factCheck: "APA reports correlation between social media use and teen mental health decline. Causation remains debated but evidence is growing.",
        sources: ["apa.org", "jama.com"],
        author: "Dr. Lisa Thompson"
      },
      { 
        title: "Misinformation Engine", 
        content: "Algorithmic amplification spreads false information faster than corrections, undermining public discourse and trust.",
        votes: 41,
        validityScore: 5,
        factCheck: "MIT study found false news spreads 6x faster than true stories on Twitter. 70% of Americans believe misinformation is a major problem.",
        sources: ["mit.edu", "pewresearch.org"],
        author: "TruthSeeker"
      }
    ],
    conArgs: [
      { 
        title: "Global Connection", 
        content: "Social media enables people to maintain relationships and build communities across distances that would otherwise be impossible.",
        votes: 38,
        validityScore: 4,
        factCheck: "Pew Research confirms 72% of Americans use social media to stay connected with friends and family, especially during pandemic isolation.",
        sources: ["pewresearch.org", "nature.com"],
        author: "Alex Rivera"
      },
      { 
        title: "Democratic Movements", 
        content: "Social media has enabled organizing for civil rights, political change, and humanitarian causes on unprecedented scales.",
        votes: 35,
        validityScore: 4,
        factCheck: "Arab Spring, BLM, and climate movements all leveraged social media for coordination. However, authoritarian regimes also use these platforms.",
        sources: ["journalofdemocracy.org", "cfr.org"],
        author: "ActivistVoice"
      }
    ]
  },
  {
    proposition: "Nuclear energy is essential for addressing climate change.",
    proArgs: [
      { 
        title: "Zero Carbon Baseload", 
        content: "Nuclear provides reliable, carbon-free electricity 24/7, unlike intermittent solar and wind power.",
        votes: 52,
        validityScore: 5,
        factCheck: "IEA data confirms nuclear has lowest lifecycle emissions of any electricity source at 12g CO2/kWh, compared to 41g for solar.",
        sources: ["iea.org", "ipcc.ch"],
        author: "ClimateEngineer"
      },
      { 
        title: "Land Efficiency", 
        content: "Nuclear plants produce vastly more energy per square meter than solar or wind farms, preserving natural habitats.",
        votes: 44,
        validityScore: 5,
        factCheck: "Nuclear requires 0.3 sq km per TWh vs 19 sq km for wind and 8 sq km for solar. This is 25-60x more efficient.",
        sources: ["ourworldindata.org", "energy.gov"],
        author: "Emily Watson"
      }
    ],
    conArgs: [
      { 
        title: "Waste Problem", 
        content: "Radioactive waste remains dangerous for thousands of years with no permanent storage solution yet implemented.",
        votes: 41,
        validityScore: 4,
        factCheck: "While technically challenging, Finland's Onkalo facility demonstrates deep geological storage is feasible. Volume of waste is relatively small.",
        sources: ["world-nuclear.org", "nei.org"],
        author: "SafetyFirst"
      },
      { 
        title: "Cost Overruns", 
        content: "New nuclear plants consistently exceed budgets by 2-3x and take decades to build, making them economically uncompetitive.",
        votes: 38,
        validityScore: 5,
        factCheck: "Vogtle Units 3&4 cost $35B vs $14B estimate. However, existing plants are often the cheapest electricity source in their regions.",
        sources: ["eia.gov", "lazard.com"],
        author: "Michael Torres"
      }
    ]
  },
  {
    proposition: "Artificial intelligence will create more jobs than it eliminates.",
    proArgs: [
      { 
        title: "Historical Precedent", 
        content: "Every technological revolution has ultimately created more jobs than it destroyed, from farming to manufacturing to computing.",
        votes: 28,
        validityScore: 3,
        factCheck: "World Economic Forum predicts 97M new jobs by 2025 vs 85M displaced. However, transition periods have historically caused significant disruption.",
        sources: ["weforum.org", "mckinsey.com"],
        author: "TechOptimist"
      },
      { 
        title: "Productivity Gains", 
        content: "AI augments human capabilities, allowing workers to accomplish more and enabling entirely new products and services.",
        votes: 25,
        validityScore: 4,
        factCheck: "GitHub Copilot users complete tasks 55% faster. AI tools are creating new roles like prompt engineers and AI trainers.",
        sources: ["github.com", "linkedin.com"],
        author: "Kevin Patel"
      }
    ],
    conArgs: [
      { 
        title: "Cognitive Jobs at Risk", 
        content: "Unlike past automation that targeted manual labor, AI threatens white-collar knowledge work that was previously considered safe.",
        votes: 33,
        validityScore: 4,
        factCheck: "Goldman Sachs estimates 300M jobs globally could be affected by generative AI. Legal, accounting, and creative fields face significant disruption.",
        sources: ["goldmansachs.com", "mit.edu"],
        author: "AIRealist"
      },
      { 
        title: "Speed of Disruption", 
        content: "AI capabilities are advancing faster than workers can retrain, creating economic displacement that social systems can't absorb.",
        votes: 29,
        validityScore: 4,
        factCheck: "Average worker retraining takes 6-12 months. GPT-4 was released 4 months after ChatGPT. Pace of change is accelerating.",
        sources: ["weforum.org", "bls.gov"],
        author: "Jennifer Liu"
      }
    ]
  },
  {
    proposition: "College education should be free for all citizens.",
    proArgs: [
      { 
        title: "Equal Opportunity", 
        content: "Free education removes financial barriers, allowing talent to flourish regardless of family wealth or background.",
        votes: 37,
        validityScore: 4,
        factCheck: "Countries with free higher education (Germany, Norway) show higher social mobility. US student debt exceeds $1.7 trillion.",
        sources: ["oecd.org", "ed.gov"],
        author: "Amanda Foster"
      },
      { 
        title: "Economic Returns", 
        content: "An educated workforce drives innovation, productivity, and tax revenues that ultimately offset the public investment.",
        votes: 31,
        validityScore: 4,
        factCheck: "College graduates earn 80% more over lifetime and pay correspondingly higher taxes. ROI estimates vary from 10-15% annually.",
        sources: ["bls.gov", "georgetown.edu"],
        author: "EconGrad"
      }
    ],
    conArgs: [
      { 
        title: "Taxpayer Burden", 
        content: "The massive cost would require significant tax increases or cuts to other essential programs and services.",
        votes: 29,
        validityScore: 4,
        factCheck: "Estimates range from $47B to $97B annually for free public college. Current federal education spending is approximately $79B.",
        sources: ["cbo.gov", "urban.org"],
        author: "FiscalHawk"
      },
      { 
        title: "Degree Devaluation", 
        content: "If everyone has a degree, its signaling value decreases, potentially requiring even more credentials for the same jobs.",
        votes: 24,
        validityScore: 3,
        factCheck: "Credential inflation is documented: jobs that required high school in 1970 now often require bachelor's. Causation is debated.",
        sources: ["nber.org", "hbr.org"],
        author: "Robert Kim"
      }
    ]
  },
  {
    proposition: "Cryptocurrencies will eventually replace traditional currencies.",
    proArgs: [
      { 
        title: "Decentralization", 
        content: "Crypto removes control from governments and central banks, preventing manipulation, censorship, and inflationary policies.",
        votes: 19,
        validityScore: 3,
        factCheck: "Bitcoin's fixed supply contrasts with fiat currency inflation. However, crypto volatility and regulatory risks remain significant barriers.",
        sources: ["bitcoin.org", "federalreserve.gov"],
        author: "CryptoMaxi"
      },
      { 
        title: "Financial Inclusion", 
        content: "1.7 billion unbanked adults can access financial services with just a smartphone, bypassing traditional banking infrastructure.",
        votes: 17,
        validityScore: 4,
        factCheck: "World Bank confirms 1.7B unbanked globally. M-Pesa in Kenya shows mobile money can reach underserved populations effectively.",
        sources: ["worldbank.org", "cgap.org"],
        author: "Priya Sharma"
      }
    ],
    conArgs: [
      { 
        title: "Volatility", 
        content: "Price swings of 10-20% in days make crypto unsuitable as a stable store of value or reliable medium of exchange.",
        votes: 26,
        validityScore: 5,
        factCheck: "Bitcoin has experienced 50%+ drawdowns multiple times. El Salvador's Bitcoin adoption has resulted in $60M+ in losses for the government.",
        sources: ["coinmarketcap.com", "reuters.com"],
        author: "TradFiDefender"
      },
      { 
        title: "Energy Consumption", 
        content: "Bitcoin mining consumes more electricity than many countries, contributing to carbon emissions and grid strain.",
        votes: 23,
        validityScore: 5,
        factCheck: "Cambridge estimates Bitcoin uses 120+ TWh/year, comparable to Argentina. However, renewable mining is growing rapidly.",
        sources: ["cambridge.org", "iea.org"],
        author: "Daniel Green"
      }
    ]
  },
  {
    proposition: "Voting should be mandatory for all eligible citizens.",
    proArgs: [
      { 
        title: "True Representation", 
        content: "Mandatory voting ensures elected officials represent the entire population, not just the most motivated or extreme voters.",
        votes: 21,
        validityScore: 4,
        factCheck: "Australia's compulsory voting achieves 90%+ turnout vs ~60% in US. Studies show more centrist policy outcomes in mandatory systems.",
        sources: ["aec.gov.au", "brookings.edu"],
        author: "DemocracyNow"
      },
      { 
        title: "Civic Engagement", 
        content: "Mandatory voting creates a culture where citizens are more informed and engaged with political issues beyond just elections.",
        votes: 18,
        validityScore: 3,
        factCheck: "Research shows mixed results. Some studies find higher political knowledge in compulsory systems; others find no significant difference.",
        sources: ["cambridge.org", "jstor.org"],
        author: "Helen Park"
      }
    ],
    conArgs: [
      { 
        title: "Freedom of Choice", 
        content: "The right to vote necessarily includes the right not to vote; compulsion violates personal liberty and freedom of expression.",
        votes: 25,
        validityScore: 4,
        factCheck: "First Amendment scholars debate whether abstention is protected speech. ACLU has expressed concerns about compulsory voting proposals.",
        sources: ["aclu.org", "law.cornell.edu"],
        author: "LibertyFirst"
      },
      { 
        title: "Uninformed Voting", 
        content: "Forcing disengaged citizens to vote may lead to random choices or easily manipulated voting patterns.",
        votes: 20,
        validityScore: 3,
        factCheck: "Donkey voting (choosing first option) is documented in Australia at 1-2%. Impact on overall election outcomes is minimal but real.",
        sources: ["aec.gov.au", "electoral-reform.org"],
        author: "Nathan Brooks"
      }
    ]
  },
  {
    proposition: "Space exploration funding should be increased significantly.",
    proArgs: [
      { 
        title: "Technological Spinoffs", 
        content: "Space research has produced countless innovations from GPS to memory foam to water purification systems.",
        votes: 34,
        validityScore: 5,
        factCheck: "NASA documents over 2,000 spinoff technologies. Economic studies estimate $7-14 return for every $1 invested in space R&D.",
        sources: ["nasa.gov", "space.com"],
        author: "SpaceEnthusiast"
      },
      { 
        title: "Species Survival", 
        content: "Becoming multi-planetary is essential insurance against extinction-level events like asteroid impacts or supervolcanoes.",
        votes: 29,
        validityScore: 4,
        factCheck: "Dinosaur extinction 66M years ago was caused by asteroid impact. Probability of similar event is low but consequences are existential.",
        sources: ["nasa.gov", "nature.com"],
        author: "Chris Nakamura"
      }
    ],
    conArgs: [
      { 
        title: "Earthly Priorities", 
        content: "Billions of dollars could address immediate crises like poverty, disease, and climate change right here on Earth.",
        votes: 27,
        validityScore: 3,
        factCheck: "NASA's $25B budget is 0.5% of federal spending. However, opportunity cost arguments depend on assumption that funds would transfer to other priorities.",
        sources: ["whitehouse.gov", "givewell.org"],
        author: "EarthFirst"
      },
      { 
        title: "Private Sector Efficiency", 
        content: "Companies like SpaceX are advancing space technology more efficiently than government programs at a fraction of the cost.",
        votes: 24,
        validityScore: 4,
        factCheck: "SpaceX Falcon 9 costs ~$2,700/kg to orbit vs Space Shuttle's $54,500/kg. However, NASA funded much of SpaceX's early development.",
        sources: ["spacex.com", "gao.gov"],
        author: "Rachel Adams"
      }
    ]
  },
  {
    proposition: "The minimum wage should be raised to a living wage.",
    proArgs: [
      { 
        title: "Reduced Poverty", 
        content: "Higher wages lift workers out of poverty and reduce dependence on government assistance programs like food stamps.",
        votes: 39,
        validityScore: 4,
        factCheck: "CBO estimates $15 minimum wage would lift 900,000 out of poverty. Currently, many full-time minimum wage workers qualify for SNAP benefits.",
        sources: ["cbo.gov", "epi.org"],
        author: "WorkerAdvocate"
      },
      { 
        title: "Economic Stimulus", 
        content: "Low-wage workers spend nearly all additional income locally, boosting demand for goods and services.",
        votes: 33,
        validityScore: 4,
        factCheck: "Federal Reserve data shows bottom 60% of earners have marginal propensity to consume of 0.8-0.9 vs 0.3-0.4 for top 10%.",
        sources: ["federalreserve.gov", "epi.org"],
        author: "Marcus Johnson"
      }
    ],
    conArgs: [
      { 
        title: "Job Losses", 
        content: "Businesses may cut hours, automate positions, or close entirely if forced to pay wages above worker productivity levels.",
        votes: 32,
        validityScore: 4,
        factCheck: "CBO estimates 1.4M job losses from $15 minimum wage. However, some economists argue job loss estimates are overstated based on historical data.",
        sources: ["cbo.gov", "nber.org"],
        author: "SmallBizOwner"
      },
      { 
        title: "Regional Disparities", 
        content: "A national living wage ignores vast cost-of-living differences; $15 in Mississippi has 50% more purchasing power than in NYC.",
        votes: 28,
        validityScore: 5,
        factCheck: "BLS data confirms regional price parity ranges from 85 (Mississippi) to 118 (Hawaii). One-size-fits-all approach is inefficient.",
        sources: ["bls.gov", "bea.gov"],
        author: "Lauren Wright"
      }
    ]
  }
]

export default function Home() {
  const { user, loading, signIn } = useAuth()
  const [currentDebateIndex, setCurrentDebateIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const transitionToDebate = (newIndex: number, manual: boolean = false) => {
    if (newIndex === displayIndex || isTransitioning) return
    if (manual) {
      setAutoCycleEnabled(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    setIsTransitioning(true)
    setTimeout(() => {
      setDisplayIndex(newIndex)
      setCurrentDebateIndex(newIndex)
      setTimeout(() => {
        setIsTransitioning(false)
      }, 50)
    }, 300)
  }

  useEffect(() => {
    if (!autoCycleEnabled) return
    
    intervalRef.current = setInterval(() => {
      const nextIndex = (currentDebateIndex + 1) % SAMPLE_DEBATES.length
      transitionToDebate(nextIndex)
    }, 5000) // Change every 5 seconds
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentDebateIndex, autoCycleEnabled])

  return (
    <div className="relative min-h-screen overflow-hidden text-text-primary">
      <Header />
      
      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="mx-auto max-w-4xl space-y-16">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-0">
              {/* <Image 
                src="/logo-icon.png" 
                alt="Debately logo" 
                width={110} 
                height={100}
                className="opacity-100"
              /> */}
              <p className="text-5xl text-white/100 font-[var(--font-dm-sans)] font-bold">
                debately.
              </p>
            </div>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] font-light leading-tight tracking-[-0.04em]">
              AI-powered debate platform for <span className="text-white">structured discourse</span>.
            </h1>
            <p className="text-text-secondary text-lg">
              Create topics, contribute arguments, let AI synthesize understanding. The resilient platform for structured debate.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!loading && !user ? (
              <Button 
                size="lg" 
                className="btn-primary text-lg px-8 py-6 rounded-full"
                onClick={signIn}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Start with Google
              </Button>
            ) : (
              <Link href="/new">
                <Button 
                  size="lg" 
                  className="btn-primary text-lg px-8 py-6 rounded-full"
                >
                  Start a Debate
                </Button>
              </Link>
            )}
            <Link href="/browse">
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 rounded-full"
              >
                Browse Topics
              </Button>
            </Link>
          </div>

          {/* Features Section */}
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Community-Driven Arguments",
                description: "Every topic starts with real perspectives. Users contribute pro and con arguments with sources."
              },
              {
                number: "02",
                title: "AI Synthesis",
                description: "Claude analyzes all arguments to generate summaries, identify consensus, and track how debates evolve."
              },
              {
                number: "03",
                title: "Structured Discourse",
                description: "Balanced presentation prevents echo chambers. See both sides, understand the nuances."
              }
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="card card-hover text-left p-8"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-text-tertiary mb-3">
                  {feature.number}
                </p>
                <h3 className="text-xl font-light mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Sample Debate Section */}
          <div className="card p-8 overflow-hidden">
            {/* Animated Content Container */}
            <div 
              className="transition-all duration-300 ease-out"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateX(-20px)' : 'translateX(0)',
              }}
            >
              {/* Proposition Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-sm text-text-tertiary uppercase tracking-[0.3em]">Organized Layouts</span>
                </div>
                <h2 className="text-2xl font-light text-white leading-tight">
                  {SAMPLE_DEBATES[displayIndex].proposition}
                </h2>
                <p className="text-xs text-text-tertiary mt-2">Arguments sorted by validity (highest quality first)</p>
              </div>

              {/* Arguments Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pro Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-green-500 rounded-full" />
                    <h4 className="text-lg font-semibold text-green-500">Pro Arguments</h4>
                  </div>
                  
                  {SAMPLE_DEBATES[displayIndex].proArgs.map((arg, idx) => (
                    <Card key={idx} className="card p-5">
                      {/* Voting UI */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-1 border border-gray-700/50">
                          <button className="h-6 w-6 p-0 flex items-center justify-center hover:bg-green-950/30 text-green-400 hover:text-green-300 rounded">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold min-w-[2rem] text-center text-green-400">
                            +{arg.votes}
                          </span>
                          <button className="h-6 w-6 p-0 flex items-center justify-center hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded">
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Title & Validity */}
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-green-400 font-semibold flex-1">{arg.title}</h5>
                        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0 bg-yellow-950/20 px-2 py-1 rounded border border-yellow-500/30">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < arg.validityScore
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-500 fill-transparent'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-yellow-400 ml-1 font-semibold">{arg.validityScore}/5</span>
                        </div>
                      </div>
                      
                      <p className="text-text-secondary text-sm mb-3">{arg.content}</p>
                      
                      {/* Fact Check Box */}
                      <div className="mb-3 p-3 bg-black/30 rounded border border-yellow-500/20">
                        <p className="text-xs text-yellow-300 font-semibold mb-1">Fact-Check:</p>
                        <p className="text-xs text-text-tertiary">{arg.factCheck}</p>
                      </div>
                      
                      {/* Sources */}
                      <div className="pt-3 border-t border-gray-700/50">
                        <p className="text-xs text-accent-warning mb-2 font-semibold">Verified using:</p>
                        <div className="flex flex-wrap gap-2">
                          {arg.sources.map((source, srcIdx) => (
                            <span
                              key={srcIdx}
                              className="flex items-center gap-1.5 text-xs text-text-tertiary"
                            >
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${source}&sz=16`}
                                alt=""
                                className="w-4 h-4"
                              />
                              <span>{source}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Author */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
                        <span className="text-xs text-text-tertiary font-mono">by {arg.author}</span>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Con Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-6 bg-rose-500 rounded-full" />
                    <h4 className="text-lg font-semibold text-rose-500">Con Arguments</h4>
                  </div>
                  
                  {SAMPLE_DEBATES[displayIndex].conArgs.map((arg, idx) => (
                    <Card key={idx} className="card p-5">
                      {/* Voting UI */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-1 border border-gray-700/50">
                          <button className="h-6 w-6 p-0 flex items-center justify-center hover:bg-green-950/30 text-green-400 hover:text-green-300 rounded">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold min-w-[2rem] text-center text-green-400">
                            +{arg.votes}
                          </span>
                          <button className="h-6 w-6 p-0 flex items-center justify-center hover:bg-red-950/30 text-red-400 hover:text-red-300 rounded">
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Title & Validity */}
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="text-rose-400 font-semibold flex-1">{arg.title}</h5>
                        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0 bg-yellow-950/20 px-2 py-1 rounded border border-yellow-500/30">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < arg.validityScore
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-500 fill-transparent'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-yellow-400 ml-1 font-semibold">{arg.validityScore}/5</span>
                        </div>
                      </div>
                      
                      <p className="text-text-secondary text-sm mb-3">{arg.content}</p>
                      
                      {/* Fact Check Box */}
                      <div className="mb-3 p-3 bg-black/30 rounded border border-yellow-500/20">
                        <p className="text-xs text-yellow-300 font-semibold mb-1">Fact-Check:</p>
                        <p className="text-xs text-text-tertiary">{arg.factCheck}</p>
                      </div>
                      
                      {/* Sources */}
                      <div className="pt-3 border-t border-gray-700/50">
                        <p className="text-xs text-accent-warning mb-2 font-semibold">Verified using:</p>
                        <div className="flex flex-wrap gap-2">
                          {arg.sources.map((source, srcIdx) => (
                            <span
                              key={srcIdx}
                              className="flex items-center gap-1.5 text-xs text-text-tertiary"
                            >
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${source}&sz=16`}
                                alt=""
                                className="w-4 h-4"
                              />
                              <span>{source}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Author */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
                        <span className="text-xs text-text-tertiary font-mono">by {arg.author}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Debate Indicator Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {SAMPLE_DEBATES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => transitionToDebate(idx, true)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentDebateIndex 
                      ? 'bg-white w-6' 
                      : 'bg-white/30 hover:bg-white/50 w-2'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Quality Control Section */}
          <div className="card p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-sm text-text-tertiary uppercase tracking-[0.3em]">Quality Control</span>
            </div>
            <h2 className="text-2xl font-light text-white leading-tight mb-2">
              AI-powered validation keeps debates productive
            </h2>
            <p className="text-sm text-text-tertiary mb-8">
              Invalid topics and low-quality arguments are automatically detected and rejected
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Rejected Topics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-red-500 rounded-full" />
                  <h4 className="text-lg font-semibold text-red-400">Rejected Topics</h4>
                </div>

                {/* Rejected Topic 1 */}
                <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-400 text-sm">✕</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">"The earth is flat"</p>
                      <div className="p-2 bg-black/30 rounded border border-red-500/20">
                        <p className="text-xs text-red-300 font-semibold mb-1">Rejected:</p>
                        <p className="text-xs text-text-tertiary">This is a factually false statement, not a debatable proposition. Scientific consensus confirms Earth is an oblate spheroid.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejected Topic 2 */}
                <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-400 text-sm">✕</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">"Pizza is the best food"</p>
                      <div className="p-2 bg-black/30 rounded border border-red-500/20">
                        <p className="text-xs text-red-300 font-semibold mb-1">Rejected:</p>
                        <p className="text-xs text-text-tertiary">Purely subjective preference without substantive implications. Debates should address topics with meaningful societal, ethical, or policy dimensions.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rejected Topic 3 */}
                <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-400 text-sm">✕</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-2">"[Ethnic group] are inferior"</p>
                      <div className="p-2 bg-black/30 rounded border border-red-500/20">
                        <p className="text-xs text-red-300 font-semibold mb-1">Rejected:</p>
                        <p className="text-xs text-text-tertiary">Promotes discrimination and hatred. Topics targeting protected groups with dehumanizing claims are not permitted.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejected Arguments */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-orange-500 rounded-full" />
                  <h4 className="text-lg font-semibold text-orange-400">Flagged Arguments</h4>
                </div>

                {/* Flagged Argument 1 */}
                <div className="bg-orange-500/5 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-400 text-sm">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-orange-300 text-xs font-semibold mb-1">On: "Climate change requires urgent action"</p>
                      <p className="text-white font-medium mb-2">"It was cold this winter so global warming is fake"</p>
                      <div className="p-2 bg-black/30 rounded border border-orange-500/20">
                        <p className="text-xs text-orange-300 font-semibold mb-1">Low Quality (1/5):</p>
                        <p className="text-xs text-text-tertiary">Confuses weather with climate. Local temperature fluctuations don't contradict long-term global warming trends documented across decades.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flagged Argument 2 */}
                <div className="bg-orange-500/5 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-400 text-sm">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-orange-300 text-xs font-semibold mb-1">On: "Universal healthcare improves outcomes"</p>
                      <p className="text-white font-medium mb-2">"My uncle had to wait 3 months in Canada"</p>
                      <div className="p-2 bg-black/30 rounded border border-orange-500/20">
                        <p className="text-xs text-orange-300 font-semibold mb-1">Low Quality (2/5):</p>
                        <p className="text-xs text-text-tertiary">Single anecdote without systemic analysis. Needs population-level data comparing wait times, outcomes, and costs across healthcare systems.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flagged Argument 3 */}
                <div className="bg-orange-500/5 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-400 text-sm">!</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-orange-300 text-xs font-semibold mb-1">On: "AI regulation is necessary"</p>
                      <p className="text-white font-medium mb-2">"Everyone knows AI will destroy humanity"</p>
                      <div className="p-2 bg-black/30 rounded border border-orange-500/20">
                        <p className="text-xs text-orange-300 font-semibold mb-1">Low Quality (1/5):</p>
                        <p className="text-xs text-text-tertiary">Appeals to vague consensus without evidence. Existential AI risk is debated among experts; argument needs specific mechanisms and citations.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
