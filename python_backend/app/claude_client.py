import os
import json
import boto3
from dotenv import load_dotenv
import re

# Load environment variables from .env.aws file
load_dotenv(dotenv_path='../.env.aws')

class ClaudeClient:
    def __init__(self):
        # Create Bedrock Runtime client
        self.bedrock_runtime = boto3.client(
            'bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'us-west-2'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
        )
    
    async def send_message(self, model_id, messages, enable_reasoning=False):
        """
        Send a message to Claude and get a response
        """
        try:
            # Format messages for Claude
            formatted_messages = [
                {
                    "role": msg["role"],
                    "content": [{"type": "text", "text": msg["content"]}]
                }
                for msg in messages
            ]
            
            # Create request parameters
            params = {
                "modelId": model_id,
                "contentType": "application/json",
                "accept": "application/json",
                "body": json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "messages": formatted_messages,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "system": "使用与用户相同的语言回复，除非明确指定创作或者生成，否则拒绝虚构内容，回答问题时，关键观点与事实，请引用原文！"
                })
            }
            
            # Call Claude API
            response = self.bedrock_runtime.invoke_model(**params)
            
            # Parse response
            response_body = json.loads(response["body"].read().decode())
            
            # Extract content
            response_text = ""
            reasoning_text = ""
            
            if response_body.get("content") and len(response_body["content"]) > 0:
                response_text = response_body["content"][0]["text"]
                
                # If reasoning is enabled, try to extract reasoning and response parts
                if enable_reasoning:
                    parts = self._extract_reasoning_and_response(response_text)
                    reasoning_text = parts["reasoning"]
                    response_text = parts["response"]
            
            return {
                "response": response_text,
                "reasoning": reasoning_text,
                "usage": response_body.get("usage", {})
            }
        except Exception as error:
            print(f"Error calling Claude API: {error}")
            raise error
    
    async def stream_message(self, model_id, messages, enable_reasoning=False):
        """
        Stream a message to Claude and get a response in chunks
        """
        try:
            # Format messages for Claude
            formatted_messages = [
                {
                    "role": msg["role"],
                    "content": [{"type": "text", "text": msg["content"]}]
                }
                for msg in messages
            ]
            
            # Create request parameters
            params = {
                "modelId": model_id,
                "contentType": "application/json",
                "accept": "application/json",
                "body": json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "messages": formatted_messages,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "system": "使用与用户相同的语言回复，除非明确指定创作或者生成，否则拒绝虚构内容，回答问题时，关键观点与事实，请引用原文！"
                })
            }
            
            # Call Claude API with streaming
            response = self.bedrock_runtime.invoke_model_with_response_stream(**params)
            
            full_response = ""
            is_thinking = enable_reasoning
            thinking_text = ""
            response_text = ""
            
            # Process each chunk
            for event in response["body"]:
                if "chunk" in event:
                    # Parse chunk
                    chunk_data = json.loads(event["chunk"]["bytes"].decode())
                    
                    if (chunk_data.get("type") == "content_block_delta" and 
                        chunk_data.get("delta", {}).get("type") == "text_delta"):
                        
                        text_chunk = chunk_data["delta"]["text"]
                        full_response += text_chunk
                        
                        # If reasoning is enabled, try to determine if we're in thinking or response mode
                        if enable_reasoning:
                            if is_thinking:
                                # Check if we've reached the end of thinking section
                                if any(marker in full_response for marker in [
                                    'Final Answer:', 'Final Response:', 'My answer:', 'My response:'
                                ]):
                                    is_thinking = False
                                    
                                    # Extract thinking part
                                    parts = self._extract_reasoning_and_response(full_response)
                                    thinking_text = parts["reasoning"]
                                    response_text = parts["response"]
                                    
                                    # Yield thinking and initial response
                                    yield {"type": "thinking", "content": thinking_text}
                                    yield {"type": "content", "content": response_text}
                                else:
                                    # Still in thinking mode
                                    yield {"type": "thinking", "content": text_chunk}
                            else:
                                # In response mode
                                response_text += text_chunk
                                yield {"type": "content", "content": text_chunk}
                        else:
                            # No reasoning, just send content
                            yield {"type": "content", "content": text_chunk}
            
            # If we're still in thinking mode at the end, try to extract reasoning and response
            if enable_reasoning and is_thinking:
                parts = self._extract_reasoning_and_response(full_response)
                if parts["reasoning"] and parts["response"]:
                    yield {"type": "thinking", "content": parts["reasoning"]}
                    yield {"type": "content", "content": parts["response"]}
                    full_response = parts["response"]
            
            # Signal completion
            yield {"type": "done", "content": full_response}
            
        except Exception as error:
            print(f"Error setting up streaming: {error}")
            yield {"type": "error", "error": str(error)}
    
    def _extract_reasoning_and_response(self, text):
        """
        Extract reasoning and response parts from Claude's output
        """
        # Check for markdown heading format for Thinking Process
        thinking_header_match = re.search(r'^#+\s*Thinking Process', text, re.IGNORECASE | re.MULTILINE)
        if thinking_header_match:
            # Find the next heading or the end of the text
            start_idx = thinking_header_match.end()
            next_heading_match = re.search(r'^#+\s', text[start_idx:], re.MULTILINE)
            
            if next_heading_match:
                end_idx = start_idx + next_heading_match.start()
                # Extract the reasoning and the rest as response
                return {
                    "reasoning": text[start_idx:end_idx].strip(),
                    "response": text[end_idx:].strip()
                }
        
        # Common patterns for separating reasoning from response
        separators = [
            'Final Answer:', 'Final Response:', 'My answer:', 'My response:',
            'Answer:', 'Response:', 'In conclusion:', 'To summarize:',
            '---', '###'
        ]
        
        # Try to find a separator
        for separator in separators:
            index = text.find(separator)
            if index != -1:
                return {
                    "reasoning": text[:index].strip(),
                    "response": text[index + len(separator):].strip()
                }
        
        # If no separator found, try to split by double newline
        parts = text.split('\n\n')
        if len(parts) >= 2:
            # Assume first half is reasoning, second half is response
            midpoint = len(parts) // 2
            return {
                "reasoning": '\n\n'.join(parts[:midpoint]).strip(),
                "response": '\n\n'.join(parts[midpoint:]).strip()
            }
        
        # If all else fails, return the whole text as response
        return {
            "reasoning": "",
            "response": text.strip()
        }
