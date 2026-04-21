import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RouteList from "../components/RouteList";

const ROUTES = [
  {
    id: "1_40",
    short_name: "40",
    long_name: "Northgate - Downtown",
    description: "",
    route_type: 3,
    total_segments: 80,
  },
  {
    id: "1_1",
    short_name: "1",
    long_name: "Kinnear - Downtown",
    description: "",
    route_type: 3,
    total_segments: 50,
  },
  {
    id: "40_S",
    short_name: "S Line",
    long_name: "Sounder South",
    description: "",
    route_type: 2,
    total_segments: 12,
  },
];

describe("RouteList", () => {
  it("renders all routes by default", () => {
    render(
      <RouteList routes={ROUTES} progress={[]} onSelectRoute={() => {}} />,
    );
    expect(screen.getByText("Northgate - Downtown")).toBeInTheDocument();
    expect(screen.getByText("Kinnear - Downtown")).toBeInTheDocument();
    expect(screen.getByText("Sounder South")).toBeInTheDocument();
  });

  it("filters routes by search query", async () => {
    const user = userEvent.setup();
    render(
      <RouteList routes={ROUTES} progress={[]} onSelectRoute={() => {}} />,
    );

    const search = screen.getByPlaceholderText(/search routes/i);
    await user.type(search, "Sounder");

    expect(screen.getByText("Sounder South")).toBeInTheDocument();
    expect(screen.queryByText("Northgate - Downtown")).not.toBeInTheDocument();
    expect(screen.queryByText("Kinnear - Downtown")).not.toBeInTheDocument();
  });

  it("clears search when the clear button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <RouteList routes={ROUTES} progress={[]} onSelectRoute={() => {}} />,
    );

    const search = screen.getByPlaceholderText(/search routes/i);
    await user.type(search, "zzz-no-match");
    expect(screen.queryByText("Sounder South")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear search/i }));
    expect(screen.getByText("Sounder South")).toBeInTheDocument();
  });
});
