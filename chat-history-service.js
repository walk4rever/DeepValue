import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamodb-client.js";

export class ChatHistoryService {
  constructor() {
    this.sessionsTable = "DeepValueChatSessions";
    this.messagesTable = "DeepValueChatMessages";
  }

  async createSession(sessionId) {
    try {
      const timestamp = Date.now();
      
      const params = {
        TableName: this.sessionsTable,
        Item: {
          sessionId,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      };
      
      await docClient.send(new PutCommand(params));
      console.log(`Created new session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error(`Error creating session ${sessionId}:`, error);
      // Create the session table if it doesn't exist
      if (error.name === 'ResourceNotFoundException') {
        console.log('Sessions table does not exist. Creating it now...');
        await this._createSessionsTable();
        // Try again after creating the table
        return this.createSession(sessionId);
      }
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const params = {
        TableName: this.sessionsTable,
        Key: { sessionId }
      };
      
      const result = await docClient.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      console.error(`Error getting session ${sessionId}:`, error);
      // If table doesn't exist, create it and return null
      if (error.name === 'ResourceNotFoundException') {
        console.log('Sessions table does not exist. Creating it now...');
        await this._createSessionsTable();
        return null;
      }
      throw error;
    }
  }

  async addMessage(sessionId, role, content) {
    try {
      const timestamp = Date.now();
      
      // Add message to messages table
      const messageParams = {
        TableName: this.messagesTable,
        Item: {
          sessionId,
          messageTimestamp: timestamp,
          role,
          content
        }
      };
      
      await docClient.send(new PutCommand(messageParams));
      
      // Update session's updatedAt timestamp
      const sessionParams = {
        TableName: this.sessionsTable,
        Key: { sessionId },
        UpdateExpression: "set updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":updatedAt": timestamp
        }
      };
      
      try {
        await docClient.send(new UpdateCommand(sessionParams));
      } catch (sessionError) {
        // If session doesn't exist, create it
        if (sessionError.name === 'ResourceNotFoundException') {
          await this.createSession(sessionId);
        } else {
          throw sessionError;
        }
      }
      
      return timestamp;
    } catch (error) {
      console.error(`Error adding message for session ${sessionId}:`, error);
      // If messages table doesn't exist, create it
      if (error.name === 'ResourceNotFoundException') {
        console.log('Messages table does not exist. Creating it now...');
        await this._createMessagesTable();
        // Try again after creating the table
        return this.addMessage(sessionId, role, content);
      }
      throw error;
    }
  }

  async getMessages(sessionId) {
    try {
      const params = {
        TableName: this.messagesTable,
        KeyConditionExpression: "sessionId = :sessionId",
        ExpressionAttributeValues: {
          ":sessionId": sessionId
        },
        ScanIndexForward: true // true for ascending order by sort key
      };
      
      const result = await docClient.send(new QueryCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error(`Error getting messages for session ${sessionId}:`, error);
      // If table doesn't exist, create it and return empty array
      if (error.name === 'ResourceNotFoundException') {
        console.log('Messages table does not exist. Creating it now...');
        await this._createMessagesTable();
        return [];
      }
      throw error;
    }
  }

  async clearSession(sessionId) {
    try {
      // Get all messages for the session
      const messages = await this.getMessages(sessionId);
      
      // Delete each message
      for (const message of messages) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: this.messagesTable,
            Key: {
              sessionId: message.sessionId,
              messageTimestamp: message.messageTimestamp
            }
          }));
        } catch (error) {
          console.error(`Error deleting message:`, error);
          // Continue with other messages even if one fails
        }
      }
      
      // Return the same session ID instead of creating a new one
      return sessionId;
    } catch (error) {
      console.error(`Error clearing session ${sessionId}:`, error);
      // Return the original session ID even if there's an error
      return sessionId;
    }
  }

  // Helper methods to create tables if they don't exist
  async _createSessionsTable() {
    console.log('Creating sessions table...');
    // This would normally use AWS SDK to create the table
    // But for now, we'll just log the error since we don't have permissions
    console.log('Please create the DeepValueChatSessions table manually with sessionId (String) as the primary key');
  }

  async _createMessagesTable() {
    console.log('Creating messages table...');
    // This would normally use AWS SDK to create the table
    // But for now, we'll just log the error since we don't have permissions
    console.log('Please create the DeepValueChatMessages table manually with sessionId (String) as the partition key and messageTimestamp (Number) as the sort key');
  }
}
