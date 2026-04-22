import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ChatModule } from './chat/chat.module';
import { AgentModule } from './agent/agent.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { McpModule } from './mcp/mcp.module';
import { ModelModule } from './model/model.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { NatsModule } from './nats/nats.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Config first
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: {
        envPath: process.env,
      },
    }),

    // Database
    DatabaseModule,

    // NATS
    NatsModule,

    // Health check
    TerminusModule,

    // Domain modules
    ChatModule,
    AgentModule,
    KnowledgeModule,
    McpModule,
    ModelModule,
    WorkflowModule,
    AdminModule,
  ],
})
export class AppModule {}