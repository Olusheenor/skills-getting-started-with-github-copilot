from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    # Make a shallow copy of initial activities to restore after each test
    orig = {
        name: {
            "description": data["description"],
            "schedule": data["schedule"],
            "max_participants": data["max_participants"],
            "participants": list(data["participants"]),
        }
        for name, data in activities.items()
    }
    yield
    # restore
    activities.clear()
    activities.update(orig)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_duplicate_signup():
    # Sign up a new participant for Chess Club
    email = "testuser@mergington.edu"
    resp = client.post(f"/activities/Chess Club/signup?email={email}")
    assert resp.status_code == 200
    assert email in activities["Chess Club"]["participants"]

    # Duplicate signup should return 400
    resp2 = client.post(f"/activities/Chess Club/signup?email={email}")
    assert resp2.status_code == 400


def test_remove_participant():
    email = "michael@mergington.edu"
    # Ensure participant exists initially
    assert email in activities["Chess Club"]["participants"]

    resp = client.delete(f"/activities/Chess Club/participants?email={email}")
    assert resp.status_code == 200
    assert email not in activities["Chess Club"]["participants"]

    # Removing again should be 404
    resp2 = client.delete(f"/activities/Chess Club/participants?email={email}")
    assert resp2.status_code == 404
