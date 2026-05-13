from mcp_sdk_uv.server import MCPServer
from pydantic import BaseModel

class ListProjectsInput(BaseModel):
    filter: dict = None
    limit: int = None
    offset: int = None

def list_projects_handler(input, ctx):
    # TODO: Implement stateless, idempotent logic
    # Return: {'content': [{'type': 'text', 'text': ...}] }
    return {'content': [{'type': 'text', 'text': 'Sample project list (implement real logic)'}]}

server = MCPServer(name='spp-mcp', version='2.0.0')
server.register_tool(
    'list_projects',
    input_schema=ListProjectsInput,
    handler=list_projects_handler,
    description="List all projects in Redspace SPP."
)

# Run server (stdio or SSE)
server.run_stdio()
