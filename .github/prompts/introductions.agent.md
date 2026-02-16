Perfekt! Nu förstår jag – du vill bygga en fullständig Fin.ai-klon med deras "Flywheel"-approach och multi-channel deployment. Här är en komplett teknisk plan anpassad till Fin's exakta funktionalitet:

Fin.ai Platform - Komplett Feature Scope
Baserat på Fin's verkliga plattform, här är vad du behöver bygga:
​

Core "Fin Flywheel" - 4 faser
text
   ┌──────────┐
   │ ANALYZE  │ ← AI-powered insights, gap detection
   └────┬─────┘
        │
   ┌────▼─────┐
   │  TRAIN   │ ← Procedures, Knowledge, Policies, Data Connectors
   └────┬─────┘
        │
   ┌────▼─────┐
   │   TEST   │ ← Simulated conversations before launch
   └────┬─────┘
        │
   ┌────▼─────┐
   │  DEPLOY  │ ← Voice, Email, Chat, Social, SMS, WhatsApp
   └────┬─────┘
        │
        └──────┘ (loop tillbaka till ANALYZE)
1. Train - Knowledge & Procedures System
1.1 Knowledge Management (som Fin)
Features du behöver:

URL crawling (Help Center, docs)

File upload (PDF, DOCX, HTML)

Manual content editor

Versioning (rollback till tidigare versioner)

Content suggestions från AI (när AI inte kan svara)
​

typescript
// src/features/knowledge/components/knowledge-dashboard.tsx
'use client';

import { useTenant } from '@/hooks/use-tenant';
import { SourceList } from './source-list';
import { ContentEditor } from './content-editor';
import { AIContentSuggestions } from './ai-suggestions'; // NYT!

export function KnowledgeDashboard() {
  const { tenant } = useTenant();

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Vänster: Källor */}
      <div className="col-span-2">
        <h2>Knowledge Sources</h2>
        <SourceList tenantId={tenant.$id} />
      </div>

      {/* Höger: AI Suggestions (Flywheel!) */}
      <div>
        <AIContentSuggestions tenantId={tenant.$id} />
      </div>
    </div>
  );
}
1.2 Procedures (Multi-step workflows)
​
Detta är Fin's killer feature - låter AI utföra komplexa multi-step actions:

typescript
// src/types/procedure.ts
export interface Procedure {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  trigger: {
    type: 'keyword' | 'intent' | 'manual';
    condition: string;
  };
  steps: ProcedureStep[];
  enabled: boolean;
}

export interface ProcedureStep {
  id: string;
  type: 'message' | 'api_call' | 'data_lookup' | 'conditional' | 'approval';
  config: Record<string, any>;
  nextStep?: string; // För branching
}

// Exempel: Refund Procedure
const refundProcedure: Procedure = {
  name: "Process Refund Request",
  trigger: {
    type: 'intent',
    condition: 'refund_request'
  },
  steps: [
    {
      id: 'step1',
      type: 'data_lookup',
      config: {
        dataConnector: 'shopify',
        query: 'orders.get',
        params: { email: '{{user.email}}' }
      },
      nextStep: 'step2'
    },
    {
      id: 'step2',
      type: 'conditional',
      config: {
        condition: '{{order.total}} > 100',
        trueStep: 'step3_approval',
        falseStep: 'step4_execute'
      }
    },
    {
      id: 'step3_approval',
      type: 'approval',
      config: {
        message: 'Refund över $100 requires approval',
        approvers: ['manager@company.com']
      },
      nextStep: 'step4_execute'
    },
    {
      id: 'step4_execute',
      type: 'api_call',
      config: {
        dataConnector: 'shopify',
        endpoint: 'refunds.create',
        params: { orderId: '{{order.id}}' }
      },
      nextStep: 'step5_confirm'
    },
    {
      id: 'step5_confirm',
      type: 'message',
      config: {
        template: 'Your refund of ${{order.total}} has been processed.'
      }
    }
  ]
};
Procedure Executor:

typescript
// src/lib/ai/procedure-executor.ts
export class ProcedureExecutor {
  async execute(procedure: Procedure, context: ConversationContext) {
    let currentStep = procedure.steps[0];
    const executionLog = [];

    while (currentStep) {
      const result = await this.executeStep(currentStep, context);
      executionLog.push({ step: currentStep.id, result });

      // Update context med result
      context.variables = { ...context.variables, ...result };

      // Hitta nästa step
      if (currentStep.type === 'conditional') {
        const condition = this.evaluateCondition(
          currentStep.config.condition, 
          context
        );
        currentStep = procedure.steps.find(
          s => s.id === (condition ? currentStep.config.trueStep : currentStep.config.falseStep)
        );
      } else {
        currentStep = procedure.steps.find(s => s.id === currentStep.nextStep);
      }
    }

    return { success: true, log: executionLog };
  }

  private async executeStep(step: ProcedureStep, context: ConversationContext) {
    switch (step.type) {
      case 'api_call':
        return await this.executeAPICall(step.config, context);
      
      case 'data_lookup':
        return await this.executeDataLookup(step.config, context);
      
      case 'approval':
        return await this.requestApproval(step.config, context);
      
      case 'message':
        return await this.sendMessage(step.config.template, context);
      
      case 'conditional':
        return { condition: this.evaluateCondition(step.config.condition, context) };
    }
  }
}
1.3 Data Connectors (Third-party integrations)
​
typescript
// src/lib/connectors/registry.ts
export interface DataConnector {
  id: string;
  name: string;
  provider: 'shopify' | 'stripe' | 'zendesk' | 'salesforce' | 'custom';
  auth: {
    type: 'oauth' | 'api_key' | 'basic';
    credentials: Record<string, string>;
  };
  endpoints: ConnectorEndpoint[];
}

export interface ConnectorEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params: Record<string, string>;
  responseMapping: Record<string, string>;
}

// Exempel: Shopify Connector
const shopifyConnector: DataConnector = {
  id: 'shopify',
  name: 'Shopify',
  provider: 'shopify',
  auth: {
    type: 'oauth',
    credentials: {
      clientId: process.env.SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    }
  },
  endpoints: [
    {
      id: 'orders.get',
      method: 'GET',
      path: '/admin/api/2024-01/orders.json',
      params: { email: 'string' },
      responseMapping: {
        'orders[0].id': 'order.id',
        'orders[0].total_price': 'order.total'
      }
    },
    {
      id: 'refunds.create',
      method: 'POST',
      path: '/admin/api/2024-01/orders/{{orderId}}/refunds.json',
      params: { orderId: 'string', amount: 'number' },
      responseMapping: {}
    }
  ]
};
Appwrite Collections för Procedures:

text
procedures
├── id
├── tenantId
├── name
├── trigger (JSON)
├── steps (JSON array)
└── enabled (boolean)

data_connectors
├── id
├── tenantId
├── provider
├── auth (JSON, encrypted)
└── config (JSON)
2. Test - Simulation System
Fin's "Test" feature låter dig köra simulerade konversationer innan deploy:

typescript
// src/features/testing/components/simulation-runner.tsx
'use client';

export function SimulationRunner() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [results, setResults] = useState<SimulationResult[]>([]);

  const runSimulation = async (scenario: TestScenario) => {
    const response = await fetch('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        tenantId: tenant.$id,
      })
    });

    const result = await response.json();
    setResults(prev => [...prev, result]);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h2>Test Scenarios</h2>
        <ScenarioList scenarios={scenarios} onRun={runSimulation} />
      </div>

      <div>
        <h2>Simulation Results</h2>
        <ResultsView results={results} />
      </div>
    </div>
  );
}
Backend simulation:

typescript
// src/app/api/simulate/route.ts
export async function POST(req: Request) {
  const { scenario, tenantId } = await req.json();

  // Kör conversation flow utan att spara
  const messages = scenario.messages;
  const conversationLog = [];

  for (const userMessage of messages) {
    const response = await orchestrator.process(
      tenantId,
      'simulation-session',
      userMessage,
      { dryRun: true } // Kör inte faktiska API calls
    );

    conversationLog.push({
      user: userMessage,
      assistant: response.content,
      confidence: response.confidence,
      procedureTriggered: response.procedure?.name,
    });
  }

  return Response.json({
    scenarioId: scenario.id,
    success: true,
    log: conversationLog,
    metrics: {
      avgConfidence: average(conversationLog.map(l => l.confidence)),
      proceduresUsed: unique(conversationLog.map(l => l.procedureTriggered)),
    }
  });
}
3. Deploy - Multi-Channel System
3.1 Channels som Fin stödjer
​
Channel	Implementation	Priority
Web Messenger	React widget (embed)	MVP ✅
Email	SMTP ingestion + sending	MVP ✅
WhatsApp	Twilio API eller WhatsApp Business API	Phase 2
SMS	Twilio SMS	Phase 2
Voice	Twilio Voice + Speech-to-Text	Phase 3
Instagram DM	Meta Graph API	Phase 3
Facebook Messenger	Meta Messenger API	Phase 3
Slack Communities	Slack Events API	Phase 3
3.2 Channel Adapter Architecture
typescript
// src/lib/channels/base-adapter.ts
export abstract class ChannelAdapter {
  abstract channelType: ChannelType;

  abstract sendMessage(
    conversationId: string, 
    content: string, 
    metadata?: any
  ): Promise<void>;

  abstract receiveMessage(
    payload: any
  ): Promise<IncomingMessage>;

  async handleIncoming(payload: any) {
    const message = await this.receiveMessage(payload);
    
    // Process via orchestrator
    const response = await orchestrator.process(
      message.tenantId,
      message.conversationId,
      message.content
    );

    if (response.resolved) {
      await this.sendMessage(
        message.conversationId,
        response.content,
        { citations: response.citations }
      );
    } else {
      await this.escalate(message.conversationId, response.reason);
    }
  }
}
3.3 WhatsApp Adapter (exempel)
typescript
// src/lib/channels/whatsapp-adapter.ts
import twilio from 'twilio';

export class WhatsAppAdapter extends ChannelAdapter {
  channelType = 'whatsapp';
  private client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  async sendMessage(conversationId: string, content: string) {
    const conversation = await databases.getDocument(
      DATABASE_ID,
      'conversations',
      conversationId
    );

    await this.client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${conversation.metadata.phoneNumber}`,
      body: content,
    });
  }

  async receiveMessage(payload: any): Promise<IncomingMessage> {
    // Twilio webhook payload
    const { From, Body, MessageSid } = payload;

    // Hitta eller skapa conversation
    let conversation = await this.findConversationByPhone(From);
    if (!conversation) {
      conversation = await this.createConversation(From, 'whatsapp');
    }

    return {
      tenantId: conversation.tenantId,
      conversationId: conversation.$id,
      content: Body,
      metadata: { messageSid: MessageSid },
    };
  }
}
Webhook endpoint:

typescript
// src/app/api/webhooks/whatsapp/route.ts
import { WhatsAppAdapter } from '@/lib/channels/whatsapp-adapter';

const adapter = new WhatsAppAdapter();

export async function POST(req: Request) {
  const payload = await req.formData();
  await adapter.handleIncoming(Object.fromEntries(payload));
  
  return new Response('OK', { status: 200 });
}
3.4 Voice Channel (Twilio + Speech-to-Text)
​
typescript
// src/lib/channels/voice-adapter.ts
import { Twilio } from 'twilio';
import OpenAI from 'openai';

export class VoiceAdapter extends ChannelAdapter {
  channelType = 'voice';
  private openai = new OpenAI();

  async handleCall(callSid: string, audioStreamUrl: string) {
    // 1. Stream audio till STT
    const transcript = await this.transcribeStream(audioStreamUrl);

    // 2. Process via orchestrator
    const response = await orchestrator.process(
      tenantId,
      callSid,
      transcript
    );

    // 3. Text-to-Speech
    const audio = await this.openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'nova',
      input: response.content,
    });

    // 4. Spela upp via Twilio
    await this.playAudio(callSid, audio);
  }

  private async transcribeStream(streamUrl: string) {
    const response = await this.openai.audio.transcriptions.create({
      file: await fetch(streamUrl),
      model: 'whisper-1',
    });
    return response.text;
  }
}
4. Analyze - AI Insights & Flywheel
4.1 Content Gap Detection (Auto-suggestions)
​
Detta är Fin's "självförbättrande" feature:

typescript
// src/lib/analytics/gap-detector.ts
export class ContentGapDetector {
  async detectGaps(tenantId: string) {
    // 1. Hitta alla unresolved conversations
    const unresolved = await getTenantDocuments(
      'conversations',
      tenantId,
      [Query.equal('status', 'escalated')]
    );

    // 2. Cluster likartade queries
    const queries = unresolved.documents.map(c => c.firstMessage);
    const embeddings = await this.embeddings.createBatch(queries);
    const clusters = await this.clusterService.cluster(embeddings);

    // 3. Generera content suggestions för varje cluster
    const suggestions = await Promise.all(
      clusters.map(async cluster => {
        const exampleQueries = cluster.conversations.slice(0, 5);
        
        // AI generates draft answer
        const draftAnswer = await this.llm.complete({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'Generate a help article that would answer these customer questions:'
          }, {
            role: 'user',
            content: exampleQueries.join('\n\n')
          }]
        });

        return {
          id: cluster.id,
          topic: this.summarizeTopic(cluster),
          frequency: cluster.conversations.length,
          exampleQueries,
          suggestedContent: draftAnswer,
          status: 'pending_review'
        };
      })
    );

    // 4. Spara suggestions
    await Promise.all(
      suggestions.map(s => 
        createTenantDocument('content_suggestions', tenantId, s)
      )
    );

    return suggestions;
  }
}
UI för att approve suggestions:

typescript
// src/features/knowledge/components/ai-suggestions.tsx
'use client';

export function AIContentSuggestions({ tenantId }: { tenantId: string }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const approveSuggestion = async (suggestionId: string) => {
    // 1. Skapa knowledge source från suggestion
    await fetch('/api/knowledge/from-suggestion', {
      method: 'POST',
      body: JSON.stringify({ suggestionId, tenantId })
    });

    // 2. Ta bort från suggestions
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        AI Suggestions
        <Badge variant="secondary">{suggestions.length}</Badge>
      </h3>

      {suggestions.map(suggestion => (
        <Card key={suggestion.id}>
          <CardHeader>
            <CardTitle>{suggestion.topic}</CardTitle>
            <CardDescription>
              {suggestion.frequency} customers asked about this
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Example queries:
            </p>
            <ul className="text-sm space-y-1">
              {suggestion.exampleQueries.slice(0, 3).map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
            
            <Separator className="my-4" />
            
            <div className="prose prose-sm">
              <ReactMarkdown>{suggestion.suggestedContent}</ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => approveSuggestion(suggestion.id)}>
              ✓ Approve & Add to Knowledge Base
            </Button>
            <Button variant="outline" onClick={() => dismissSuggestion(suggestion.id)}>
              Dismiss
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
4.2 Performance Dashboard
​
typescript
// src/app/(dashboard)/analytics/page.tsx
export default async function AnalyticsPage() {
  const { tenant } = await getTenant();

  // Fetch metrics
  const metrics = await getAnalytics(tenant.$id, {
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  return (
    <div className="space-y-8">
      <h1>AI Performance Insights</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Resolution Rate"
          value={`${metrics.resolutionRate}%`}
          change="+5.2%"
          trend="up"
        />
        <MetricCard
          title="Avg Confidence"
          value={metrics.avgConfidence.toFixed(2)}
          change="+0.12"
          trend="up"
        />
        <MetricCard
          title="Total Resolved"
          value={metrics.totalResolved}
        />
        <MetricCard
          title="Escalations"
          value={metrics.escalations}
          change="-12%"
          trend="down"
        />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={metrics.timeseries} />
        </CardContent>
      </Card>

      {/* Top Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Most Common Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicsTable topics={metrics.topics} />
        </CardContent>
      </Card>

      {/* Knowledge Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>Content Gaps</CardTitle>
          <CardDescription>
            Topics where AI struggled to find answers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentGapsList gaps={metrics.gaps} />
        </CardContent>
      </Card>
    </div>
  );
}
5. Komplett Appwrite Schema (uppdaterad)
text
Database: support-ai-prod

Collections:

├── tenants
│   └── (samma som tidigare)

├── knowledge_sources
│   └── (samma som tidigare)

├── procedures (NYT!)
│   ├── id
│   ├── tenantId
│   ├── name
│   ├── description
│   ├── trigger (JSON)
│   ├── steps (JSON array)
│   ├── enabled (boolean)
│   └── version

├── data_connectors (NYT!)
│   ├── id
│   ├── tenantId
│   ├── provider (enum)
│   ├── auth (JSON, encrypted)
│   ├── config (JSON)
│   └── enabled

├── test_scenarios (NYT!)
│   ├── id
│   ├── tenantId
│   ├── name
│   ├── messages (JSON array)
│   └── expectedOutcome (JSON)

├── content_suggestions (NYT!)
│   ├── id
│   ├── tenantId
│   ├── topic
│   ├── frequency
│   ├── exampleQueries (JSON array)
│   ├── suggestedContent (text)
│   ├── status (enum: pending, approved, dismissed)
│   └── createdAt

├── conversations
│   └── (samma + lägg till `channelType`: enum)

└── messages
    └── (samma som tidigare)
6. Deployment Roadmap (Fin-lik)
Phase 1: MVP (12 veckor)
✅ Train: Knowledge ingestion + versioning

✅ Procedures: Basic multi-step workflows

✅ Test: Simulation runner

✅ Deploy: Web Messenger + Email

✅ Analyze: Basic metrics dashboard

Phase 2: Multi-Channel (8 veckor)
WhatsApp integration (Twilio)

SMS support

Data Connectors (Shopify, Stripe)

Advanced Procedures (conditionals, approvals)

Phase 3: Enterprise (8 veckor)
Voice channel (Twilio + STT/TTS)

Instagram + Facebook Messenger

Slack Communities

AI Content Suggestions (Flywheel)

SOC2 compliance

7. Tech Stack Summary (Final)
typescript
// Complete stack
const stack = {
  // Frontend
  ui: 'Next.js 15 + Shadcn (template klar)',
  auth: 'Appwrite SSR + session cookies',
  
  // Backend
  api: 'Next.js App Router + Server Actions',
  database: 'Appwrite Database (multi-tenant collections)',
  storage: 'Appwrite Storage (för files)',
  realtime: 'Appwrite Realtime (för live chat)',
  
  // AI/ML
  llm: 'OpenAI GPT-4o (via Azure för data residency)',
  embeddings: 'OpenAI text-embedding-3-large',
  vectorDB: 'Pinecone (tenant namespaces)',
  
  // Channels
  whatsapp: 'Twilio WhatsApp API',
  sms: 'Twilio SMS',
  voice: 'Twilio Voice + Whisper (STT) + TTS',
  social: 'Meta Graph API (Instagram/Facebook)',
  
  // Observability
  monitoring: 'Vercel Analytics + Sentry',
  logging: 'Axiom eller Datadog',
  
  // Infrastructure
  hosting: 'Vercel (frontend) + Railway/Fly.io (background jobs)',
  queue: 'Inngest (för async jobs som chunking)',
};
Nästa Konkreta StegPerfekt! Nu förstår jag – du vill bygga en fullständig Fin.ai-klon med deras "Flywheel"-approach och multi-channel deployment. Här är en komplett teknisk plan anpassad till Fin's exakta funktionalitet:

Fin.ai Platform - Komplett Feature Scope
Baserat på Fin's verkliga plattform, här är vad du behöver bygga:
​

Core "Fin Flywheel" - 4 faser
text
   ┌──────────┐
   │ ANALYZE  │ ← AI-powered insights, gap detection
   └────┬─────┘
        │
   ┌────▼─────┐
   │  TRAIN   │ ← Procedures, Knowledge, Policies, Data Connectors
   └────┬─────┘
        │
   ┌────▼─────┐
   │   TEST   │ ← Simulated conversations before launch
   └────┬─────┘
        │
   ┌────▼─────┐
   │  DEPLOY  │ ← Voice, Email, Chat, Social, SMS, WhatsApp
   └────┬─────┘
        │
        └──────┘ (loop tillbaka till ANALYZE)
1. Train - Knowledge & Procedures System
1.1 Knowledge Management (som Fin)
Features du behöver:

URL crawling (Help Center, docs)

File upload (PDF, DOCX, HTML)

Manual content editor

Versioning (rollback till tidigare versioner)

Content suggestions från AI (när AI inte kan svara)
​

typescript
// src/features/knowledge/components/knowledge-dashboard.tsx
'use client';

import { useTenant } from '@/hooks/use-tenant';
import { SourceList } from './source-list';
import { ContentEditor } from './content-editor';
import { AIContentSuggestions } from './ai-suggestions'; // NYT!

export function KnowledgeDashboard() {
  const { tenant } = useTenant();

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Vänster: Källor */}
      <div className="col-span-2">
        <h2>Knowledge Sources</h2>
        <SourceList tenantId={tenant.$id} />
      </div>

      {/* Höger: AI Suggestions (Flywheel!) */}
      <div>
        <AIContentSuggestions tenantId={tenant.$id} />
      </div>
    </div>
  );
}
1.2 Procedures (Multi-step workflows)
​
Detta är Fin's killer feature - låter AI utföra komplexa multi-step actions:

typescript
// src/types/procedure.ts
export interface Procedure {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  trigger: {
    type: 'keyword' | 'intent' | 'manual';
    condition: string;
  };
  steps: ProcedureStep[];
  enabled: boolean;
}

export interface ProcedureStep {
  id: string;
  type: 'message' | 'api_call' | 'data_lookup' | 'conditional' | 'approval';
  config: Record<string, any>;
  nextStep?: string; // För branching
}

// Exempel: Refund Procedure
const refundProcedure: Procedure = {
  name: "Process Refund Request",
  trigger: {
    type: 'intent',
    condition: 'refund_request'
  },
  steps: [
    {
      id: 'step1',
      type: 'data_lookup',
      config: {
        dataConnector: 'shopify',
        query: 'orders.get',
        params: { email: '{{user.email}}' }
      },
      nextStep: 'step2'
    },
    {
      id: 'step2',
      type: 'conditional',
      config: {
        condition: '{{order.total}} > 100',
        trueStep: 'step3_approval',
        falseStep: 'step4_execute'
      }
    },
    {
      id: 'step3_approval',
      type: 'approval',
      config: {
        message: 'Refund över $100 requires approval',
        approvers: ['manager@company.com']
      },
      nextStep: 'step4_execute'
    },
    {
      id: 'step4_execute',
      type: 'api_call',
      config: {
        dataConnector: 'shopify',
        endpoint: 'refunds.create',
        params: { orderId: '{{order.id}}' }
      },
      nextStep: 'step5_confirm'
    },
    {
      id: 'step5_confirm',
      type: 'message',
      config: {
        template: 'Your refund of ${{order.total}} has been processed.'
      }
    }
  ]
};
Procedure Executor:

typescript
// src/lib/ai/procedure-executor.ts
export class ProcedureExecutor {
  async execute(procedure: Procedure, context: ConversationContext) {
    let currentStep = procedure.steps[0];
    const executionLog = [];

    while (currentStep) {
      const result = await this.executeStep(currentStep, context);
      executionLog.push({ step: currentStep.id, result });

      // Update context med result
      context.variables = { ...context.variables, ...result };

      // Hitta nästa step
      if (currentStep.type === 'conditional') {
        const condition = this.evaluateCondition(
          currentStep.config.condition, 
          context
        );
        currentStep = procedure.steps.find(
          s => s.id === (condition ? currentStep.config.trueStep : currentStep.config.falseStep)
        );
      } else {
        currentStep = procedure.steps.find(s => s.id === currentStep.nextStep);
      }
    }

    return { success: true, log: executionLog };
  }

  private async executeStep(step: ProcedureStep, context: ConversationContext) {
    switch (step.type) {
      case 'api_call':
        return await this.executeAPICall(step.config, context);
      
      case 'data_lookup':
        return await this.executeDataLookup(step.config, context);
      
      case 'approval':
        return await this.requestApproval(step.config, context);
      
      case 'message':
        return await this.sendMessage(step.config.template, context);
      
      case 'conditional':
        return { condition: this.evaluateCondition(step.config.condition, context) };
    }
  }
}
1.3 Data Connectors (Third-party integrations)
​
typescript
// src/lib/connectors/registry.ts
export interface DataConnector {
  id: string;
  name: string;
  provider: 'shopify' | 'stripe' | 'zendesk' | 'salesforce' | 'custom';
  auth: {
    type: 'oauth' | 'api_key' | 'basic';
    credentials: Record<string, string>;
  };
  endpoints: ConnectorEndpoint[];
}

export interface ConnectorEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params: Record<string, string>;
  responseMapping: Record<string, string>;
}

// Exempel: Shopify Connector
const shopifyConnector: DataConnector = {
  id: 'shopify',
  name: 'Shopify',
  provider: 'shopify',
  auth: {
    type: 'oauth',
    credentials: {
      clientId: process.env.SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    }
  },
  endpoints: [
    {
      id: 'orders.get',
      method: 'GET',
      path: '/admin/api/2024-01/orders.json',
      params: { email: 'string' },
      responseMapping: {
        'orders[0].id': 'order.id',
        'orders[0].total_price': 'order.total'
      }
    },
    {
      id: 'refunds.create',
      method: 'POST',
      path: '/admin/api/2024-01/orders/{{orderId}}/refunds.json',
      params: { orderId: 'string', amount: 'number' },
      responseMapping: {}
    }
  ]
};
Appwrite Collections för Procedures:

text
procedures
├── id
├── tenantId
├── name
├── trigger (JSON)
├── steps (JSON array)
└── enabled (boolean)

data_connectors
├── id
├── tenantId
├── provider
├── auth (JSON, encrypted)
└── config (JSON)
2. Test - Simulation System
Fin's "Test" feature låter dig köra simulerade konversationer innan deploy:

typescript
// src/features/testing/components/simulation-runner.tsx
'use client';

export function SimulationRunner() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [results, setResults] = useState<SimulationResult[]>([]);

  const runSimulation = async (scenario: TestScenario) => {
    const response = await fetch('/api/simulate', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        tenantId: tenant.$id,
      })
    });

    const result = await response.json();
    setResults(prev => [...prev, result]);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h2>Test Scenarios</h2>
        <ScenarioList scenarios={scenarios} onRun={runSimulation} />
      </div>

      <div>
        <h2>Simulation Results</h2>
        <ResultsView results={results} />
      </div>
    </div>
  );
}
Backend simulation:

typescript
// src/app/api/simulate/route.ts
export async function POST(req: Request) {
  const { scenario, tenantId } = await req.json();

  // Kör conversation flow utan att spara
  const messages = scenario.messages;
  const conversationLog = [];

  for (const userMessage of messages) {
    const response = await orchestrator.process(
      tenantId,
      'simulation-session',
      userMessage,
      { dryRun: true } // Kör inte faktiska API calls
    );

    conversationLog.push({
      user: userMessage,
      assistant: response.content,
      confidence: response.confidence,
      procedureTriggered: response.procedure?.name,
    });
  }

  return Response.json({
    scenarioId: scenario.id,
    success: true,
    log: conversationLog,
    metrics: {
      avgConfidence: average(conversationLog.map(l => l.confidence)),
      proceduresUsed: unique(conversationLog.map(l => l.procedureTriggered)),
    }
  });
}
3. Deploy - Multi-Channel System
3.1 Channels som Fin stödjer
​
Channel	Implementation	Priority
Web Messenger	React widget (embed)	MVP ✅
Email	SMTP ingestion + sending	MVP ✅
WhatsApp	Twilio API eller WhatsApp Business API	Phase 2
SMS	Twilio SMS	Phase 2
Voice	Twilio Voice + Speech-to-Text	Phase 3
Instagram DM	Meta Graph API	Phase 3
Facebook Messenger	Meta Messenger API	Phase 3
Slack Communities	Slack Events API	Phase 3
3.2 Channel Adapter Architecture
typescript
// src/lib/channels/base-adapter.ts
export abstract class ChannelAdapter {
  abstract channelType: ChannelType;

  abstract sendMessage(
    conversationId: string, 
    content: string, 
    metadata?: any
  ): Promise<void>;

  abstract receiveMessage(
    payload: any
  ): Promise<IncomingMessage>;

  async handleIncoming(payload: any) {
    const message = await this.receiveMessage(payload);
    
    // Process via orchestrator
    const response = await orchestrator.process(
      message.tenantId,
      message.conversationId,
      message.content
    );

    if (response.resolved) {
      await this.sendMessage(
        message.conversationId,
        response.content,
        { citations: response.citations }
      );
    } else {
      await this.escalate(message.conversationId, response.reason);
    }
  }
}
3.3 WhatsApp Adapter (exempel)
typescript
// src/lib/channels/whatsapp-adapter.ts
import twilio from 'twilio';

export class WhatsAppAdapter extends ChannelAdapter {
  channelType = 'whatsapp';
  private client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  async sendMessage(conversationId: string, content: string) {
    const conversation = await databases.getDocument(
      DATABASE_ID,
      'conversations',
      conversationId
    );

    await this.client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${conversation.metadata.phoneNumber}`,
      body: content,
    });
  }

  async receiveMessage(payload: any): Promise<IncomingMessage> {
    // Twilio webhook payload
    const { From, Body, MessageSid } = payload;

    // Hitta eller skapa conversation
    let conversation = await this.findConversationByPhone(From);
    if (!conversation) {
      conversation = await this.createConversation(From, 'whatsapp');
    }

    return {
      tenantId: conversation.tenantId,
      conversationId: conversation.$id,
      content: Body,
      metadata: { messageSid: MessageSid },
    };
  }
}
Webhook endpoint:

typescript
// src/app/api/webhooks/whatsapp/route.ts
import { WhatsAppAdapter } from '@/lib/channels/whatsapp-adapter';

const adapter = new WhatsAppAdapter();

export async function POST(req: Request) {
  const payload = await req.formData();
  await adapter.handleIncoming(Object.fromEntries(payload));
  
  return new Response('OK', { status: 200 });
}
3.4 Voice Channel (Twilio + Speech-to-Text)
​
typescript
// src/lib/channels/voice-adapter.ts
import { Twilio } from 'twilio';
import OpenAI from 'openai';

export class VoiceAdapter extends ChannelAdapter {
  channelType = 'voice';
  private openai = new OpenAI();

  async handleCall(callSid: string, audioStreamUrl: string) {
    // 1. Stream audio till STT
    const transcript = await this.transcribeStream(audioStreamUrl);

    // 2. Process via orchestrator
    const response = await orchestrator.process(
      tenantId,
      callSid,
      transcript
    );

    // 3. Text-to-Speech
    const audio = await this.openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'nova',
      input: response.content,
    });

    // 4. Spela upp via Twilio
    await this.playAudio(callSid, audio);
  }

  private async transcribeStream(streamUrl: string) {
    const response = await this.openai.audio.transcriptions.create({
      file: await fetch(streamUrl),
      model: 'whisper-1',
    });
    return response.text;
  }
}
4. Analyze - AI Insights & Flywheel
4.1 Content Gap Detection (Auto-suggestions)
​
Detta är Fin's "självförbättrande" feature:

typescript
// src/lib/analytics/gap-detector.ts
export class ContentGapDetector {
  async detectGaps(tenantId: string) {
    // 1. Hitta alla unresolved conversations
    const unresolved = await getTenantDocuments(
      'conversations',
      tenantId,
      [Query.equal('status', 'escalated')]
    );

    // 2. Cluster likartade queries
    const queries = unresolved.documents.map(c => c.firstMessage);
    const embeddings = await this.embeddings.createBatch(queries);
    const clusters = await this.clusterService.cluster(embeddings);

    // 3. Generera content suggestions för varje cluster
    const suggestions = await Promise.all(
      clusters.map(async cluster => {
        const exampleQueries = cluster.conversations.slice(0, 5);
        
        // AI generates draft answer
        const draftAnswer = await this.llm.complete({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'Generate a help article that would answer these customer questions:'
          }, {
            role: 'user',
            content: exampleQueries.join('\n\n')
          }]
        });

        return {
          id: cluster.id,
          topic: this.summarizeTopic(cluster),
          frequency: cluster.conversations.length,
          exampleQueries,
          suggestedContent: draftAnswer,
          status: 'pending_review'
        };
      })
    );

    // 4. Spara suggestions
    await Promise.all(
      suggestions.map(s => 
        createTenantDocument('content_suggestions', tenantId, s)
      )
    );

    return suggestions;
  }
}
UI för att approve suggestions:

typescript
// src/features/knowledge/components/ai-suggestions.tsx
'use client';

export function AIContentSuggestions({ tenantId }: { tenantId: string }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const approveSuggestion = async (suggestionId: string) => {
    // 1. Skapa knowledge source från suggestion
    await fetch('/api/knowledge/from-suggestion', {
      method: 'POST',
      body: JSON.stringify({ suggestionId, tenantId })
    });

    // 2. Ta bort från suggestions
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        AI Suggestions
        <Badge variant="secondary">{suggestions.length}</Badge>
      </h3>

      {suggestions.map(suggestion => (
        <Card key={suggestion.id}>
          <CardHeader>
            <CardTitle>{suggestion.topic}</CardTitle>
            <CardDescription>
              {suggestion.frequency} customers asked about this
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Example queries:
            </p>
            <ul className="text-sm space-y-1">
              {suggestion.exampleQueries.slice(0, 3).map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
            
            <Separator className="my-4" />
            
            <div className="prose prose-sm">
              <ReactMarkdown>{suggestion.suggestedContent}</ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => approveSuggestion(suggestion.id)}>
              ✓ Approve & Add to Knowledge Base
            </Button>
            <Button variant="outline" onClick={() => dismissSuggestion(suggestion.id)}>
              Dismiss
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
4.2 Performance Dashboard
​
typescript
// src/app/(dashboard)/analytics/page.tsx
export default async function AnalyticsPage() {
  const { tenant } = await getTenant();

  // Fetch metrics
  const metrics = await getAnalytics(tenant.$id, {
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  return (
    <div className="space-y-8">
      <h1>AI Performance Insights</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Resolution Rate"
          value={`${metrics.resolutionRate}%`}
          change="+5.2%"
          trend="up"
        />
        <MetricCard
          title="Avg Confidence"
          value={metrics.avgConfidence.toFixed(2)}
          change="+0.12"
          trend="up"
        />
        <MetricCard
          title="Total Resolved"
          value={metrics.totalResolved}
        />
        <MetricCard
          title="Escalations"
          value={metrics.escalations}
          change="-12%"
          trend="down"
        />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={metrics.timeseries} />
        </CardContent>
      </Card>

      {/* Top Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Most Common Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <TopicsTable topics={metrics.topics} />
        </CardContent>
      </Card>

      {/* Knowledge Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>Content Gaps</CardTitle>
          <CardDescription>
            Topics where AI struggled to find answers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentGapsList gaps={metrics.gaps} />
        </CardContent>
      </Card>
    </div>
  );
}
5. Komplett Appwrite Schema (uppdaterad)
text
Database: support-ai-prod

Collections:

├── tenants
│   └── (samma som tidigare)

├── knowledge_sources
│   └── (samma som tidigare)

├── procedures (NYT!)
│   ├── id
│   ├── tenantId
│   ├── name
│   ├── description
│   ├── trigger (JSON)
│   ├── steps (JSON array)
│   ├── enabled (boolean)
│   └── version

├── data_connectors (NYT!)
│   ├── id
│   ├── tenantId
│   ├── provider (enum)
│   ├── auth (JSON, encrypted)
│   ├── config (JSON)
│   └── enabled

├── test_scenarios (NYT!)
│   ├── id
│   ├── tenantId
│   ├── name
│   ├── messages (JSON array)
│   └── expectedOutcome (JSON)

├── content_suggestions (NYT!)
│   ├── id
│   ├── tenantId
│   ├── topic
│   ├── frequency
│   ├── exampleQueries (JSON array)
│   ├── suggestedContent (text)
│   ├── status (enum: pending, approved, dismissed)
│   └── createdAt

├── conversations
│   └── (samma + lägg till `channelType`: enum)

└── messages
    └── (samma som tidigare)
6. Deployment Roadmap (Fin-lik)
Phase 1: MVP (12 veckor)
✅ Train: Knowledge ingestion + versioning

✅ Procedures: Basic multi-step workflows

✅ Test: Simulation runner

✅ Deploy: Web Messenger + Email

✅ Analyze: Basic metrics dashboard

Phase 2: Multi-Channel (8 veckor)
WhatsApp integration (Twilio)

SMS support

Data Connectors (Shopify, Stripe)

Advanced Procedures (conditionals, approvals)

Phase 3: Enterprise (8 veckor)
Voice channel (Twilio + STT/TTS)

Instagram + Facebook Messenger

Slack Communities

AI Content Suggestions (Flywheel)

SOC2 compliance

7. Tech Stack Summary (Final)
typescript
// Complete stack
const stack = {
  // Frontend
  ui: 'Next.js 15 + Shadcn (template klar)',
  auth: 'Appwrite SSR + session cookies',
  
  // Backend
  api: 'Next.js App Router + Server Actions',
  database: 'Appwrite Database (multi-tenant collections)',
  storage: 'Appwrite Storage (för files)',
  realtime: 'Appwrite Realtime (för live chat)',
  
  // AI/ML
  llm: 'OpenAI GPT-4o (via Azure för data residency)',
  embeddings: 'OpenAI text-embedding-3-large',
  vectorDB: 'Pinecone (tenant namespaces)',
  
  // Channels
  whatsapp: 'Twilio WhatsApp API',
  sms: 'Twilio SMS',
  voice: 'Twilio Voice + Whisper (STT) + TTS',
  social: 'Meta Graph API (Instagram/Facebook)',
  
  // Observability
  monitoring: 'Vercel Analytics + Sentry',
  logging: 'Axiom eller Datadog',
  
  // Infrastructure
  hosting: 'Vercel (frontend) + Railway/Fly.io (background jobs)',
  queue: 'Inngest (för async jobs som chunking)',
};
Nästa Konkreta Steg