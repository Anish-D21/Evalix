from __future__ import annotations

from typing import List

from pydantic import BaseModel


class EndpointInfo(BaseModel):
    path: str
    method: str
    description: str


class ServiceStatusResponseData(BaseModel):
    service: str
    environment: str
    endpoints: List[EndpointInfo]
