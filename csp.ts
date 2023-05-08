import "https://deno.land/x/lodash@4.17.19/dist/lodash.js";

/// Type definitions

/**
 * Variable assignment
 */
type Assignment<T extends string> = Record<T, any>;

/**
 * Type of constraint
 */
enum ConstraintType {
  /**
   * All variables must satisfy assignment if at least some satisfy it and all are presnt
   */
  MUST_SATISFY,

  /**
   * All variables must be different if all are present
   */
  MUST_BE_DISTINCT,
}

/**
 * Constraint
 */
type Constraint<T extends string> =
  | {
      type: ConstraintType.MUST_SATISFY;
      assignment: Partial<Assignment<T>>;
    }
  | {
      type: ConstraintType.MUST_BE_DISTINCT;
      variables: T[];
    };

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
  domains: Record<T, any[]>;

  /**
   * Set of constraints
   */
  constraints: Constraint<T>[];

  /**
   * Set of arcs in the CSP
   */
  arcs?: [T, T][];

  /**
   * Record array form of arcs
   *
   * This is precomputed as necessary and you don't need to provide this
   */
  neighbours?: Record<T, T[]>;
};

/**
 * Options for the CSP solver
 */
type SolverOptions = Partial<{
  /**
   * Propagate information from newly assigned variables by adjusting remaining legal values
   */
  forwardChecking: boolean;

  /**
   * Whether to check consistency between pairs of variables
   */
  arcConsistency: boolean;
}>;

/**
 * Copy and reverse an array of arrays
 * @param arr Array
 */
function copyAndReverse<A, B>(arr: [A, B][]) {
  return [...arr, ...arr.map(([a, b]) => [b, a] as [B, A])];
}

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
  constraints: (
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
  ).map((variables) => ({
    type: ConstraintType.MUST_BE_DISTINCT,
    variables,
  })),
  arcs: copyAndReverse([
    ["SA", "WA"],
    ["SA", "NT"],
    ["SA", "Q"],
    ["SA", "NSW"],
    ["SA", "V"],
    ["WA", "NT"],
    ["NT", "Q"],
    ["Q", "NSW"],
    ["NSW", "V"],
  ]),
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
  constraints: [
    {
      type: ConstraintType.MUST_SATISFY,
      assignment: {
        lion: true,
        today: "Thursday",
      },
    },
    {
      type: ConstraintType.MUST_SATISFY,
      assignment: {
        lion: false,
        today: "Monday",
      },
    },
    {
      type: ConstraintType.MUST_SATISFY,
      assignment: {
        unicorn: true,
        today: "Sunday",
      },
    },
    {
      type: ConstraintType.MUST_SATISFY,
      assignment: {
        unicorn: false,
        today: "Thursday",
      },
    },
  ],
  arcs: copyAndReverse([
    ["lion", "today"],
    ["unicorn", "today"],
  ]),
};

/// Algorithms

/**
 * Validate constraints in the assignment
 * @param assignment Partial assignment
 * @param constraints Constraints
 * @param strict Whether to fail if we don't compare once
 * @returns Whether constraints are satisified
 */
function validateConstraints<T extends string>(
  assignment: Partial<Assignment<T>>,
  constraints: Constraint<T>[],
  strict = false
) {
  let ranOnce = false;

  for (const constraint of constraints) {
    switch (constraint.type) {
      // Constraint where each variable must be distinct
      case ConstraintType.MUST_BE_DISTINCT: {
        for (let i = 0; i < constraint.variables.length - 1; i++) {
          for (let j = 1; j < constraint.variables.length; j++) {
            const a = constraint.variables[i];
            const b = constraint.variables[j];

            if (
              typeof assignment[a] !== "undefined" &&
              typeof assignment[b] !== "undefined"
            ) {
              ranOnce = true;
              if (assignment[a] === assignment[b]) {
                return false;
              }
            }
          }
        }

        break;
      }

      // Constraint where all variables must satisfy the assignment
      // if all of the variables are present and there is at least
      // a partial satisfaction of the assignment.
      case ConstraintType.MUST_SATISFY: {
        let fail = false;
        for (const variable of Object.keys(constraint.assignment)) {
          if (typeof assignment[variable] === "undefined") {
            fail = true;
            break;
          }
        }

        if (fail) continue;
        ranOnce = true;

        // Instead of working with pairs, we work with relations between any
        // number of variables, so if at least one of them is satisfied, we
        // check if the rest are also satisfied.
        let atLeastTruthy = false;
        let atLeastFalsey = false;
        for (const variable of Object.keys(constraint.assignment)) {
          if (assignment[variable] === constraint.assignment[variable]) {
            atLeastTruthy = true;
          }

          if (assignment[variable] !== constraint.assignment[variable]) {
            atLeastFalsey = true;
          }
        }

        if (atLeastTruthy && atLeastFalsey) {
          return false;
        }

        break;
      }
    }
  }

  return strict ? ranOnce : true;
}

/**
 * Keep track of how many times we do a full constraint satisfaction
 */
let debugCounter = 0;

/**
 * Dump current count
 */
function dumpDebugCounter() {
  console.info(
    "Needed",
    debugCounter,
    "full constraint satisfactions to compute."
  );
  debugCounter = 0;
}

/**
 * Perform recursive backtracking
 * @param csp Constraint Satisfaction Problem
 * @param assignment Assignment
 * @param options Solver options
 * @returns Final Assignment
 */
function recursiveBacktracking<T extends string>(
  csp: CSP<T>,
  assignment: Partial<Assignment<T>> = {},
  options: SolverOptions = {
    forwardChecking: false,
    arcConsistency: false,
  }
) {
  // Check if the assignment is complete and has assigned all variables.
  if (Object.keys(assignment).length === csp.variables.length)
    return assignment;

  // Perform arc consistency
  if (options.arcConsistency) {
    csp = _.cloneDeep(csp);
    if (arcConsistency(csp)) {
      console.info("AC-3 failed!");
      return;
    }
  }

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
    debugCounter += 1;
    if (validateConstraints(newAssignment, csp.constraints)) {
      let newCsp = _.cloneDeep(csp);

      // Perform forward checking
      if (options.forwardChecking) {
        if (forwardChecking(newCsp, unassignedVariable, value)) {
          return;
        }
      }

      // Recursively search more assignments
      const result = recursiveBacktracking(newCsp, newAssignment, options);

      // If successful, return the assignment.
      if (result) return result;
    }
  }
}

/**
 * Forward checking algorithm
 * @param csp Constraint Satisfaction Problem
 * @returns Whether a failure occurred
 */
function forwardChecking<T extends string>(
  csp: CSP<T>,
  variable: T,
  value: any
) {
  // Make a list of those which now only have one remaining value
  const assignmentsToPropagate: [T, any][] = [];

  // Update the domain for current variable
  csp.domains[variable] = [value];

  for (const constraint of csp.constraints) {
    switch (constraint.type) {
      // Constraint where each variable must be distinct
      case ConstraintType.MUST_BE_DISTINCT: {
        // Check if this constraint applies to this variable
        if (constraint.variables.includes(variable)) {
          // Get a list of all of the other variables
          const otherVariables = constraint.variables.filter(
            (v) => v !== variable
          );

          // Remove the current value from the other variable's domains
          for (const variable of otherVariables) {
            const domain = csp.domains[variable];

            if (domain.includes(value)) {
              // Check if removing this value would mean there are no legal moves
              if (domain.length === 1) {
                return;
              }

              // Update the domain for this variable
              csp.domains[variable] = domain.filter((x) => x !== value);

              // Check again, and add to list if necessary
              if (csp.domains[variable].length === 1) {
                assignmentsToPropagate.push([
                  variable,
                  csp.domains[variable][0],
                ]);
              }
            }
          }
        }

        break;
      }
      // Constraint where all variables must satisfy assignment if some satisfy it
      case ConstraintType.MUST_SATISFY: {
        // Not enough information to implement, skip this check.
        break;
      }
    }
  }

  // Propagate assignment for variables that only have one valid value
  if (assignmentsToPropagate.length) {
    return !!assignmentsToPropagate.find(([variable, value]) =>
      forwardChecking(_.cloneDeep(csp), variable, value)
    );
  }

  return false;
}

/**
 * Arc Consistency Algorithm
 * @param csp Constraint Satisfaction Problem
 */
function arcConsistency<T extends string>(csp: CSP<T>) {
  // Prerequisite assertion
  if (!csp.arcs) throw "Must provide arcs for AC-3!";

  // Compute neighbours if they haven't been yet
  computeNeighbours(csp);

  // Create the arc queue
  let queue = [...csp.arcs];

  // Work through the entire queue
  while (queue.length) {
    const [x, y] = queue.shift()!;

    // Check if we can remove some inconsistent value
    if (removeInconsistentValues(csp, x, y)) {
      // Fail if domain is empty
      if (!csp.domains[x].length) return true;

      // Queue up each neighbour of 'a' as 'b' => 'a'
      queue.push(...csp.neighbours![x].map((b) => [b, x] as [T, T]));
    }
  }

  return false;
}

/**
 * Compute neighbours record
 * @param csp Constraint Satisfaction Problem
 */
function computeNeighbours<T extends string>(csp: CSP<T>) {
  if (csp.arcs && !csp.neighbours) {
    csp.neighbours = {} as Record<T, T[]>;
    for (const [a, b] of csp.arcs) {
      if (!csp.neighbours[a]) {
        csp.neighbours[a] = [b];
      } else {
        csp.neighbours[a].push(b);
      }
    }
  }
}

/**
 * Remove inconsistent values (Revise algorithm)
 * @param csp Constraint Satisfaction Problem
 * @param x Variable X
 * @param y Variable Y
 */
function removeInconsistentValues<T extends string>(csp: CSP<T>, x: T, y: T) {
  let removed = false;

  for (const valueX of csp.domains[x]) {
    if (
      typeof csp.domains[y].find((valueY) => {
        return validateConstraints(
          {
            [x]: valueX,
            [y]: valueY,
          } as Assignment<T>,
          csp.constraints,
          true
        );
      }) === "undefined"
    ) {
      csp.domains[x] = csp.domains[x].filter((x) => x !== valueX);
      removed = true;
    }
  }

  return removed;
}

/// Test Cases

console.info("\n*** Lion Unicorn:");
console.info(recursiveBacktracking(LionUnicorn));
// => { today: "Thursday", lion: true, unicorn: false }
dumpDebugCounter();

console.info("\n*** Lion Unicorn (AC-3):");
console.info(
  recursiveBacktracking(LionUnicorn, undefined, {
    arcConsistency: true,
  })
);
// => { today: "Thursday", lion: true, unicorn: false }
dumpDebugCounter();

console.info("\n*** Australia:");
console.info(recursiveBacktracking(Australia));
// => { WA: "red", NT: "green", Q: "red", NSW: "green", V: "red", SA: "blue", T: "red" }
dumpDebugCounter();

console.info("\n*** Australia (forward checking):");
console.info(
  recursiveBacktracking(Australia, undefined, {
    forwardChecking: true,
  })
);
// => { WA: "red", NT: "green", Q: "red", NSW: "green", V: "red", SA: "blue", T: "red" }
dumpDebugCounter();

const AustraliaFailureCase = _.cloneDeep(Australia);
forwardChecking(AustraliaFailureCase, "WA", "red");
forwardChecking(AustraliaFailureCase, "Q", "green");

console.info("\n*** Australia: (WA = red, Q = green)");
console.info(
  recursiveBacktracking(AustraliaFailureCase, {
    WA: "red",
    Q: "green",
  })
);
// => undefined
dumpDebugCounter();

console.info("\n*** Australia (forward checking): (WA = red, Q = green)");
console.info(
  recursiveBacktracking(
    AustraliaFailureCase,
    {
      WA: "red",
      Q: "green",
    },
    {
      forwardChecking: true,
    }
  )
);
// => undefined
dumpDebugCounter();

console.info("\n*** Australia (AC-3): (WA = red, Q = green)");
console.info(
  recursiveBacktracking(
    AustraliaFailureCase,
    {
      WA: "red",
      Q: "green",
    },
    {
      arcConsistency: true,
    }
  )
);
// => undefined
dumpDebugCounter();
