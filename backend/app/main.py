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
    
    if "issuelinks" not in issue_data.get("fields", {}):
        return linked_issues
    
    for link in issue_data["fields"]["issuelinks"]:
        linked_issue_key = None
        link_type = link.get("type", {}).get("name", "relates to")
        inward = link.get("type", {}).get("inward", "relates to")
        outward = link.get("type", {}).get("outward", "relates to")
        
        if "inwardIssue" in link:
            linked_issue_key = link["inwardIssue"]["key"]
            direction = "inward"
            relationship = inward
        elif "outwardIssue" in link:
            linked_issue_key = link["outwardIssue"]["key"]
            direction = "outward"
            relationship = outward
        
        if linked_issue_key:
            try:
                linked_issue_data = await fetch_issue(credentials, linked_issue_key)
                issue_type = linked_issue_data["fields"]["issuetype"]["name"]
                
                linked_issues.append({
                    "key": linked_issue_key,
                    "data": linked_issue_data,
                    "relationship": relationship,
                    "direction": direction,
                    "issue_type": issue_type
                })
            except HTTPException:
                # Log error but continue with other links
                pass
    
    return linked_issues

def process_issue_node(issue_data, node_type="central"):
    """Convert JIRA issue data to a node for visualization"""
    fields = issue_data.get("fields", {})
    return {
        "id": issue_data["id"],
        "type": node_type,
        "data": {
            "key": issue_data["key"],
            "summary": fields.get("summary", "No summary"),
            "status": fields.get("status", {}).get("name", "Unknown"),
            "issue_type": fields.get("issuetype", {}).get("name", "Unknown"),
            "priority": fields.get("priority", {}).get("name", "None"),
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
        # Fetch central issue
        central_issue = await fetch_issue(credentials, credentials.central_jira_id)
        
        # Initialize graph data
        nodes = [process_issue_node(central_issue, "central")]
        edges = []
        processed_issues = {central_issue["id"]: True}
        
        # Fetch directly linked issues
        direct_links = await fetch_linked_issues(credentials, central_issue)
        
        # Process all linked issues
        for link in direct_links:
            if link["key"] not in processed_issues:
                issue_type_category = "related"
                if "requirement" in link["issue_type"].lower():
                    issue_type_category = "requirement"
                elif "test" in link["issue_type"].lower():
                    issue_type_category = "test"
                elif "bug" in link["issue_type"].lower() or "defect" in link["issue_type"].lower():
                    issue_type_category = "defect"
                
                nodes.append(process_issue_node(link["data"], issue_type_category))
                
                if link["direction"] == "inward":
                    edges.append(process_edge(link["data"]["id"], central_issue["id"], link["relationship"]))
                else:
                    edges.append(process_edge(central_issue["id"], link["data"]["id"], link["relationship"]))
                
                processed_issues[link["data"]["id"]] = True
                
                # If it's a requirement, fetch tests linked to it
                if issue_type_category == "requirement":
                    req_links = await fetch_linked_issues(credentials, link["data"])
                    for req_link in req_links:
                        if req_link["key"] not in processed_issues:
                            req_issue_type = "related"
                            if "test" in req_link["issue_type"].lower():
                                req_issue_type = "test"
                                
                                # If it's a test, also fetch defects linked to it
                                if req_issue_type == "test":
                                    nodes.append(process_issue_node(req_link["data"], req_issue_type))
                                    
                                    if req_link["direction"] == "inward":
                                        edges.append(process_edge(req_link["data"]["id"], link["data"]["id"], req_link["relationship"]))
                                    else:
                                        edges.append(process_edge(link["data"]["id"], req_link["data"]["id"], req_link["relationship"]))
                                    
                                    processed_issues[req_link["data"]["id"]] = True
                                    
                                    # Fetch defects linked to test
                                    test_links = await fetch_linked_issues(credentials, req_link["data"])
                                    for test_link in test_links:
                                        if test_link["key"] not in processed_issues and ("bug" in test_link["issue_type"].lower() or "defect" in test_link["issue_type"].lower()):
                                            nodes.append(process_issue_node(test_link["data"], "defect"))
                                            
                                            if test_link["direction"] == "inward":
                                                edges.append(process_edge(test_link["data"]["id"], req_link["data"]["id"], test_link["relationship"]))
                                            else:
                                                edges.append(process_edge(req_link["data"]["id"], test_link["data"]["id"], test_link["relationship"]))
                                            
                                            processed_issues[test_link["data"]["id"]] = True

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
