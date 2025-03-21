import time
from boto3.dynamodb.conditions import Key
from app.dynamodb_client import dynamodb

class ChatHistoryService:
    def __init__(self):
        self.sessions_table_name = "DeepValueChatSessions"
        self.messages_table_name = "DeepValueChatMessages"
        
        # Get DynamoDB tables
        self.sessions_table = dynamodb.Table(self.sessions_table_name)
        self.messages_table = dynamodb.Table(self.messages_table_name)
    
    async def create_session(self, session_id):
        """Create a new chat session"""
        try:
            timestamp = int(time.time() * 1000)  # Current time in milliseconds
            
            self.sessions_table.put_item(
                Item={
                    "sessionId": session_id,
                    "createdAt": timestamp,
                    "updatedAt": timestamp
                }
            )
            print(f"Created new session: {session_id}")
            return session_id
        except Exception as error:
            print(f"Error creating session {session_id}: {error}")
            # Create the session table if it doesn't exist
            if hasattr(error, "response") and error.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                print("Sessions table does not exist. Creating it now...")
                await self._create_sessions_table()
                # Try again after creating the table
                return await self.create_session(session_id)
            raise error
    
    async def get_session(self, session_id):
        """Get a chat session by ID"""
        try:
            response = self.sessions_table.get_item(
                Key={"sessionId": session_id}
            )
            return response.get("Item")
        except Exception as error:
            print(f"Error getting session {session_id}: {error}")
            # If table doesn't exist, create it and return None
            if hasattr(error, "response") and error.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                print("Sessions table does not exist. Creating it now...")
                await self._create_sessions_table()
                return None
            raise error
    
    async def add_message(self, session_id, role, content):
        """Add a message to a chat session"""
        try:
            timestamp = int(time.time() * 1000)  # Current time in milliseconds
            
            # Add message to messages table
            self.messages_table.put_item(
                Item={
                    "sessionId": session_id,
                    "messageTimestamp": timestamp,
                    "role": role,
                    "content": content
                }
            )
            
            # Update session's updatedAt timestamp
            try:
                self.sessions_table.update_item(
                    Key={"sessionId": session_id},
                    UpdateExpression="set updatedAt = :updatedAt",
                    ExpressionAttributeValues={
                        ":updatedAt": timestamp
                    }
                )
            except Exception as session_error:
                # If session doesn't exist, create it
                if hasattr(session_error, "response") and session_error.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                    await self.create_session(session_id)
                else:
                    raise session_error
            
            return timestamp
        except Exception as error:
            print(f"Error adding message for session {session_id}: {error}")
            # If messages table doesn't exist, create it
            if hasattr(error, "response") and error.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                print("Messages table does not exist. Creating it now...")
                await self._create_messages_table()
                # Try again after creating the table
                return await self.add_message(session_id, role, content)
            raise error
    
    async def get_messages(self, session_id):
        """Get all messages for a chat session"""
        try:
            response = self.messages_table.query(
                KeyConditionExpression=Key("sessionId").eq(session_id),
                ScanIndexForward=True  # true for ascending order by sort key
            )
            return response.get("Items", [])
        except Exception as error:
            print(f"Error getting messages for session {session_id}: {error}")
            # If table doesn't exist, create it and return empty array
            if hasattr(error, "response") and error.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                print("Messages table does not exist. Creating it now...")
                await self._create_messages_table()
                return []
            raise error
    
    async def clear_session(self, session_id):
        """Clear all messages for a chat session"""
        try:
            # Get all messages for the session
            messages = await self.get_messages(session_id)
            
            # Delete each message
            for message in messages:
                try:
                    self.messages_table.delete_item(
                        Key={
                            "sessionId": message["sessionId"],
                            "messageTimestamp": message["messageTimestamp"]
                        }
                    )
                except Exception as error:
                    print(f"Error deleting message: {error}")
                    # Continue with other messages even if one fails
            
            # Return the same session ID instead of creating a new one
            return session_id
        except Exception as error:
            print(f"Error clearing session {session_id}: {error}")
            # Return the original session ID even if there's an error
            return session_id
    
    # Helper methods to create tables if they don't exist
    async def _create_sessions_table(self):
        print("Creating sessions table...")
        # This would normally use boto3 to create the table
        # But for now, we'll just log the error since we don't have permissions
        print("Please create the DeepValueChatSessions table manually with sessionId (String) as the primary key")
    
    async def _create_messages_table(self):
        print("Creating messages table...")
        # This would normally use boto3 to create the table
        # But for now, we'll just log the error since we don't have permissions
        print("Please create the DeepValueChatMessages table manually with sessionId (String) as the partition key and messageTimestamp (Number) as the sort key")
