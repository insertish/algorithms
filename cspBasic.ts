/// Type definitions

/**
 * Variable assignment
 */
type Assignment<T extends string> = Record<T, any>;

/**
 * Constraint Satisfaction Problem
 */
type CSP<T extends string> = {
  /**
   * Set of variables
   */
  variables: readonly T[];

  /**
   * Set of domains that each variable can be assigned to
   */
  domains: Record<T, Value>;

  /**
   * Function for validating the given assignment is consistent
   * @param assignment Assignment
   * @returns Whether it is consistent
   */
  constraints: (assignment: Partial<Assignment<T>>) => boolean;
};

/**
 * Helper type
 */
type Value = string[] | boolean[] | number[];

/// CSP: Australia Map Colouring

const AUSTRALIA_VARIABLES = ["WA", "NT", "Q", "NSW", "V", "SA", "T"] as const;

const Australia: CSP<(typeof AUSTRALIA_VARIABLES)[number]> = {
  variables: AUSTRALIA_VARIABLES,
  domains: AUSTRALIA_VARIABLES.reduce(
    (prev, cur) => ({
      ...prev,
      // All variables may either be "red", "green", or "blue"
      [cur]: ["red", "green", "blue"],
    }),
    {} as any
  ),
  constraints: (assignment) => {
    // Ensure none of these pairs match
    return !(
      [
        ["SA", "WA"],
        ["SA", "NT"],
        ["SA", "Q"],
        ["SA", "NSW"],
        ["SA", "V"],
        ["WA", "NT"],
        ["NT", "Q"],
        ["Q", "NSW"],
        ["NSW", "V"],
      ] as [
        (typeof AUSTRALIA_VARIABLES)[number],
        (typeof AUSTRALIA_VARIABLES)[number]
      ][]
    )
      // Find the values for the pair of variables
      .map((variables) => variables.map((variable) => assignment[variable]))
      // Make sure each value has actually been assigned
      .filter((values) => values.every((value) => typeof value !== "undefined"))
      // Find a pair of values that are equal to each other
      .find(([a, b]) => a === b);
  },
};

/// CSP: Lion Unicorn Problem

const LionUnicorn: CSP<"today" | "lion" | "unicorn"> = {
  variables: ["today", "lion", "unicorn"],
  domains: {
    today: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    lion: [true, false],
    unicorn: [true, false],
  },
  constraints: (assignment) => {
    return typeof assignment.today === "undefined"
      ? // If today is not set yet, we are consistent
        true
      : // Otherwise, check if we are inconsistent
        ![
          {
            lion: true,
            today: "Thursday",
          },
          {
            lion: false,
            today: "Monday",
          },
          {
            unicorn: true,
            today: "Sunday",
          },
          {
            unicorn: false,
            today: "Thursday",
          },
        ].find((constraint) => {
          // Get the other corresponding key
          const target = Object.keys(constraint).find((x) => x !== "today")!;

          // Check if the other variable is assigned
          if (typeof assignment[target] !== "undefined") {
            // Check if the assigned value equals the constraint
            if (assignment[target] === constraint[target]) {
              // If so, check if the constraint is consistent
              if (assignment.today !== constraint.today) {
                // If not, signal that we are inconsisten
                return true;
              }
            }
          }
        });
  },
};

/// Algorithms

/**
 * Perform recursive backtracking
 * @param csp Constraint Satisfaction Problem
 * @param assignment Assignment
 * @returns Final Assignment
 */
function recursiveBacktracking<T extends string>(
  csp: CSP<T>,
  assignment: Partial<Assignment<T>> = {}
) {
  // Check if the assignment is complete and has assigned all variables.
  if (Object.keys(assignment).length === csp.variables.length)
    return assignment;

  // Pick an unassigned variable
  const unassignedVariable = csp.variables.find(
    (variable) => typeof assignment[variable] === "undefined"
  )!;

  // Go through each possible value specified in domain
  for (const value of csp.domains[unassignedVariable]) {
    const newAssignment = {
      ...assignment,
      [unassignedVariable]: value,
    };

    // Check if applying this value leaves the assignment in a consistent state
    if (csp.constraints(newAssignment)) {
      // Recursively search more assignments
      const result = recursiveBacktracking(csp, newAssignment);

      // If successful, return the assignment.
      if (result) return result;
    }
  }
}

console.info(recursiveBacktracking(Australia));
console.info(recursiveBacktracking(LionUnicorn));
