from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import base64
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="JIRA Visualization API", 
              description="API for fetching and visualizing JIRA issues and their relationships")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JiraCredentials(BaseModel):
    username: str
    api_token: str
    base_url: str
    project_id: str
    central_jira_id: str

class JiraIssue(BaseModel):
    id: str
    key: str
    summary: str
    issue_type: str
    status: str
    description: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

@app.get("/")
async def root():
    return {"message": "JIRA Visualization API is running"}

@app.get("/api/jira/default-credentials")
async def get_default_credentials():
    """Get default JIRA credentials from the .env file"""
    return {
        "username": os.getenv("JIRA_USERNAME", ""),
        "api_token": os.getenv("JIRA_API_TOKEN", ""),
        "base_url": os.getenv("JIRA_BASE_URL", ""),
        "project_id": os.getenv("JIRA_PROJECT_ID", ""),
        "central_jira_id": ""  # This should be provided by the user
    }

def get_auth_header(credentials: JiraCredentials):
    auth_str = f"{credentials.username}:{credentials.api_token}"
    auth_bytes = auth_str.encode('ascii')
    base64_bytes = base64.b64encode(auth_bytes)
    base64_auth = base64_bytes.decode('ascii')
    return {"Authorization": f"Basic {base64_auth}"}

async def fetch_issue(credentials: JiraCredentials, issue_key: str):
    """Fetch a single JIRA issue by key"""
    headers = get_auth_header(credentials)
    async with httpx.AsyncClient() as client:
        url = f"{credentials.base_url}/rest/api/2/issue/{issue_key}"
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise HTTPException(status_code=401, detail="Authentication failed. Check your JIRA credentials.")
            elif e.response.status_code == 404:
                raise HTTPException(status_code=404, detail=f"JIRA issue {issue_key} not found.")
            else:
                raise HTTPException(status_code=e.response.status_code, detail=f"JIRA API error: {str(e)}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Error connecting to JIRA: {str(e)}")

async def fetch_linked_issues(credentials: JiraCredentials, issue_data):
    """Extract and fetch all linked issues from a JIRA issue"""
    linked_issues = []
    
    # Validate input to avoid NoneType errors
    if not issue_data or not isinstance(issue_data, dict):
        return linked_issues
    
    # Check if the fields key exists and has issuelinks
    fields = issue_data.get("fields", {})
    if not fields or not fields.get("issuelinks"):
        return linked_issues
    
    for link in fields.get("issuelinks", []):
        if not link or not isinstance(link, dict):
            continue
            
        linked_issue_key = None
        link_type = link.get("type", {}).get("name", "relates to")
        inward = link.get("type", {}).get("inward", "relates to")
        outward = link.get("type", {}).get("outward", "relates to")
        
        # Get the linked issue key safely
        if "inwardIssue" in link and isinstance(link["inwardIssue"], dict):
            linked_issue_key = link["inwardIssue"].get("key")
            direction = "inward"
            relationship = inward
        elif "outwardIssue" in link and isinstance(link["outwardIssue"], dict):
            linked_issue_key = link["outwardIssue"].get("key")
            direction = "outward"
            relationship = outward
        
        if linked_issue_key:
            try:
                linked_issue_data = await fetch_issue(credentials, linked_issue_key)
                
                # Safely get issue type
                issue_type = "Unknown"
                if linked_issue_data and "fields" in linked_issue_data:
                    if "issuetype" in linked_issue_data["fields"]:
                        issue_type = linked_issue_data["fields"]["issuetype"].get("name", "Unknown")
                
                linked_issues.append({
                    "key": linked_issue_key,
                    "data": linked_issue_data,
                    "relationship": relationship,
                    "direction": direction,
                    "issue_type": issue_type
                })
            except HTTPException as e:
                print(f"Error fetching linked issue {linked_issue_key}: {str(e)}")
                # Log error but continue with other links
                pass
            except Exception as e:
                print(f"Unexpected error with linked issue {linked_issue_key}: {str(e)}")
                # Continue with other links
                pass
    
    return linked_issues

async def fetch_parent_issue(credentials: JiraCredentials, issue_data):
    """Extract and fetch parent issue from a JIRA issue"""
    
    # Validate input to avoid NoneType errors
    if not issue_data or not isinstance(issue_data, dict):
        return None
    
    # Check if the fields key exists
    fields = issue_data.get("fields", {})
    if not fields:
        return None
    
    # Check for parent field - different JIRA instances might use different parent field names
    # Common ones are "parent" or inside "customfield" with a key like "Epic Link"
    parent_key = None
    
    # Check for standard parent field
    if "parent" in fields and isinstance(fields["parent"], dict):
        parent_key = fields["parent"].get("key")
    
    # If no standard parent field, check for Epic Link
    elif "customfield_10014" in fields:  # Epic Link is often stored in this field
        parent_key = fields.get("customfield_10014")
    
    # Check for any field that might contain "parent" in its name
    else:
        for field_name, field_value in fields.items():
            if "parent" in field_name.lower() and field_value:
                if isinstance(field_value, dict) and "key" in field_value:
                    parent_key = field_value.get("key")
                elif isinstance(field_value, str):
                    parent_key = field_value
                break
    
    if parent_key:
        try:
            parent_data = await fetch_issue(credentials, parent_key)
            
            # Safely get issue type
            issue_type = "Unknown"
            if parent_data and "fields" in parent_data:
                if "issuetype" in parent_data["fields"]:
                    issue_type = parent_data["fields"]["issuetype"].get("name", "Unknown")
            
            return {
                "key": parent_key,
                "data": parent_data,
                "relationship": "is child of",  # The current issue is a child of the parent
                "direction": "inward",  # Parent is inward from child
                "issue_type": issue_type
            }
        except HTTPException as e:
            print(f"Error fetching parent issue {parent_key}: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error with parent issue {parent_key}: {str(e)}")
            return None
    
    return None

def process_issue_node(issue_data, node_type="central"):
    """Convert JIRA issue data to a node for visualization"""
    if not issue_data:
        # Handle null issue data with a placeholder node
        return {
            "id": f"unknown-{id(issue_data)}",
            "type": node_type,
            "data": {
                "key": "Unknown",
                "summary": "Missing issue data",
                "status": "Unknown",
                "issue_type": "Unknown",
                "priority": "None",
                "description": "",
                "updated": "",
                "created": "",
                "assignee": "Unassigned",
                "reporter": "Unknown",
            }
        }
        
    fields = issue_data.get("fields", {})
    
    # Process description - clean and truncate for display if needed
    description = fields.get("description", "")
    
    # Use get method with defaults for all dictionary access to prevent NoneType errors
    return {
        "id": issue_data.get("id", f"unknown-{id(issue_data)}"),
        "type": node_type,
        "data": {
            "key": issue_data.get("key", "Unknown"),
            "summary": fields.get("summary", "No summary"),
            "status": fields.get("status", {}).get("name", "Unknown"),
            "issue_type": fields.get("issuetype", {}).get("name", "Unknown"),
            "priority": fields.get("priority", {}).get("name", "None"),
            "description": description,  # Add full description for LLM processing
            "updated": fields.get("updated", ""),
            "created": fields.get("created", ""),
            "assignee": fields.get("assignee", {}).get("displayName", "Unassigned") if fields.get("assignee") else "Unassigned",
            "reporter": fields.get("reporter", {}).get("displayName", "Unknown") if fields.get("reporter") else "Unknown",
        }
    }

def process_edge(source_id, target_id, relationship):
    """Create an edge between two nodes"""
    return {
        "id": f"e{source_id}-{target_id}",
        "source": source_id,
        "target": target_id,
        "label": relationship
    }

@app.post("/api/jira/visualize", response_model=GraphData)
async def visualize_jira(credentials: JiraCredentials):
    """
    Fetch JIRA issues and build a visualization graph
    """
    try:
        # Validate input
        if not credentials or not credentials.central_jira_id:
            raise HTTPException(status_code=400, detail="Missing JIRA credentials or central issue ID")

        # Fetch central issue
        central_issue = await fetch_issue(credentials, credentials.central_jira_id)
        if not central_issue or not isinstance(central_issue, dict) or "id" not in central_issue:
            raise HTTPException(status_code=404, detail=f"Central issue {credentials.central_jira_id} not found or has invalid format")
        
        # Initialize graph data
        central_node = process_issue_node(central_issue, "central")
        nodes = [central_node]
        edges = []
        processed_issues = {central_issue.get("id"): True}
        
        # Check for parent issue
        parent_issue = await fetch_parent_issue(credentials, central_issue)
        
        # Process parent issue if it exists
        if parent_issue and parent_issue.get("data") and parent_issue["data"].get("id"):
            parent_data = parent_issue.get("data", {})
            parent_id = parent_data.get("id")
            
            # Only process if we haven't seen this issue before
            if parent_id and parent_id not in processed_issues:
                # Determine issue type category for parent
                parent_type = parent_issue.get("issue_type", "").lower()
                parent_type_category = "parent"  # New category for parent issues
                
                # Create parent node
                parent_node = process_issue_node(parent_data, parent_type_category)
                nodes.append(parent_node)
                
                # Create edge from child to parent
                central_id = central_issue.get("id")
                edges.append(process_edge(central_id, parent_id, "is child of"))
                
                processed_issues[parent_id] = True
                
                # Fetch parents of parent (grandparents) recursively up to 2 levels
                grandparent_issue = await fetch_parent_issue(credentials, parent_data)
                if grandparent_issue and grandparent_issue.get("data") and grandparent_issue["data"].get("id"):
                    gparent_data = grandparent_issue.get("data", {})
                    gparent_id = gparent_data.get("id")
                    
                    if gparent_id and gparent_id not in processed_issues:
                        # Create grandparent node
                        gparent_node = process_issue_node(gparent_data, "parent")
                        nodes.append(gparent_node)
                        
                        # Create edge from parent to grandparent
                        edges.append(process_edge(parent_id, gparent_id, "is child of"))
                        
                        processed_issues[gparent_id] = True
        
        # Fetch directly linked issues
        direct_links = await fetch_linked_issues(credentials, central_issue)
        
        # Process all linked issues
        for link in direct_links:
            # Skip invalid links
            if not link or not isinstance(link, dict) or "key" not in link or "data" not in link:
                continue
                
            link_data = link.get("data", {})
            link_id = link_data.get("id")
            
            # Skip already processed issues and validate ID
            if not link_id or link_id in processed_issues:
                continue
                
            # Determine issue type category
            issue_type = link.get("issue_type", "").lower()
            issue_type_category = "related"
            
            if "requirement" in issue_type:
                issue_type_category = "requirement"
            elif "test" in issue_type:
                issue_type_category = "test"
            elif "bug" in issue_type or "defect" in issue_type:
                issue_type_category = "defect"
            
            # Process node and add it
            link_node = process_issue_node(link_data, issue_type_category)
            nodes.append(link_node)
            
            # Create edge based on direction
            central_id = central_issue.get("id")
            if link.get("direction") == "inward":
                edges.append(process_edge(link_id, central_id, link.get("relationship", "relates to")))
            else:
                edges.append(process_edge(central_id, link_id, link.get("relationship", "relates to")))
            
            processed_issues[link_id] = True
                
            # If it's a requirement, fetch tests linked to it
            if issue_type_category == "requirement":
                req_links = await fetch_linked_issues(credentials, link_data)
                for req_link in req_links:
                    # Skip invalid links
                    if not req_link or not isinstance(req_link, dict) or "key" not in req_link or "data" not in req_link:
                        continue
                            
                        req_link_data = req_link.get("data", {})
                        req_link_id = req_link_data.get("id")
                        
                        # Skip already processed issues and validate ID
                        if not req_link_id or req_link_id in processed_issues:
                            continue
                        
                        # Determine the issue type
                        req_issue_type = "related"
                        if "test" in req_link.get("issue_type", "").lower():
                            req_issue_type = "test"
                            
                            # If it's a test, process it and fetch defects linked to it
                            if req_issue_type == "test":
                                nodes.append(process_issue_node(req_link_data, req_issue_type))
                                
                                # Safe access to direction and relationship using get method
                                direction = req_link.get("direction")
                                relationship = req_link.get("relationship", "relates to")
                                
                                # Create edges depending on direction
                                if direction == "inward":
                                    edges.append(process_edge(req_link_id, link_id, relationship))
                                else:
                                    edges.append(process_edge(link_id, req_link_id, relationship))
                                
                                processed_issues[req_link_id] = True
                                
                                # Fetch defects linked to test
                                test_links = await fetch_linked_issues(credentials, req_link_data)
                                for test_link in test_links:
                                    # Skip invalid links
                                    if not test_link or not isinstance(test_link, dict) or "key" not in test_link or "data" not in test_link:
                                        continue
                                        
                                    test_link_data = test_link.get("data", {})
                                    test_link_id = test_link_data.get("id")
                                    
                                    # Skip already processed issues and validate ID
                                    if not test_link_id or test_link_id in processed_issues:
                                        continue
                                    
                                    # Check if it's a bug/defect
                                    test_link_issue_type = test_link.get("issue_type", "").lower()
                                    if ("bug" in test_link_issue_type or "defect" in test_link_issue_type):
                                        nodes.append(process_issue_node(test_link_data, "defect"))
                                        
                                        # Safe access to direction and relationship
                                        test_direction = test_link.get("direction")
                                        test_relationship = test_link.get("relationship", "relates to")
                                        
                                        # Create edges depending on direction
                                        if test_direction == "inward":
                                            edges.append(process_edge(test_link_id, req_link_id, test_relationship))
                                        else:
                                            edges.append(process_edge(req_link_id, test_link_id, test_relationship))
                                        
                                        processed_issues[test_link_id] = True

        return GraphData(nodes=nodes, edges=edges)
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing JIRA data: {str(e)}")

@app.post("/api/jira/test-connection")
async def test_connection(credentials: JiraCredentials):
    """Test JIRA API connection with provided credentials"""
    try:
        headers = get_auth_header(credentials)
        async with httpx.AsyncClient() as client:
            url = f"{credentials.base_url}/rest/api/2/myself"
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            user_data = response.json()
            return {
                "success": True,
                "message": f"Successfully connected to JIRA as {user_data.get('displayName', 'user')}",
                "user": user_data
            }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Authentication failed. Check your JIRA credentials.")
        else:
            raise HTTPException(status_code=e.response.status_code, detail=f"JIRA API error: {str(e)}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to JIRA: {str(e)}")

class IssueDetailsRequest(BaseModel):
    username: str
    api_token: str
    base_url: str
    project_id: str
    issue_key: str

@app.post("/api/jira/issue-details")
async def get_issue_details(request: IssueDetailsRequest):
    """
    Fetch detailed information for a specific JIRA issue
    This endpoint provides comprehensive information including the full description 
    that can be used for LLM analysis or detailed display
    """
    credentials = JiraCredentials(
        username=request.username,
        api_token=request.api_token,
        base_url=request.base_url,
        project_id=request.project_id,
        central_jira_id=request.issue_key  # Reusing this field for the issue key
    )
    issue_key = request.issue_key
    try:
        # Validate input
        if not issue_key:
            raise HTTPException(status_code=400, detail="Missing JIRA issue key")
            
        # Fetch issue data
        issue_data = await fetch_issue(credentials, issue_key)
        
        # Validate response
        if not issue_data or not isinstance(issue_data, dict):
            raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found or has invalid format")
        
        # Extract fields with safe access
        fields = issue_data.get("fields", {})
        
        # Format the response with all relevant fields for LLM processing
        detailed_data = {
            "id": issue_data.get("id", f"unknown-{id(issue_data)}"),
            "key": issue_data.get("key", "Unknown"),
            "summary": fields.get("summary", "No summary"),
            "description": fields.get("description", ""),
            "status": fields.get("status", {}).get("name", "Unknown"),
            "issue_type": fields.get("issuetype", {}).get("name", "Unknown"),
            "priority": fields.get("priority", {}).get("name", "None"),
            "created": fields.get("created", ""),
            "updated": fields.get("updated", ""),
            "creator": fields.get("creator", {}).get("displayName", "Unknown") if fields.get("creator") else "Unknown",
            "reporter": fields.get("reporter", {}).get("displayName", "Unknown") if fields.get("reporter") else "Unknown",
            "assignee": fields.get("assignee", {}).get("displayName", "Unassigned") if fields.get("assignee") else "Unassigned",
            "labels": fields.get("labels", []),
            "components": [comp.get("name", "") for comp in fields.get("components", []) if isinstance(comp, dict)],
            "comments": [
                {
                    "author": comment.get("author", {}).get("displayName", "Unknown") if comment.get("author") else "Unknown",
                    "body": comment.get("body", ""),
                    "created": comment.get("created", "")
                }
                for comment in fields.get("comment", {}).get("comments", []) if isinstance(comment, dict)
            ]
        }
        
        return detailed_data
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing JIRA data: {str(e)}")
