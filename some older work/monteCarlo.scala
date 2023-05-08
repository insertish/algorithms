type Entry = (Char, Double)

val ep1: List[Entry] = List(('A', -3), ('B', -2), ('B', -2), ('C', -4), ('D', -1))
val ep2: List[Entry] = List(('B', -1), ('A', -4), ('C', -4), ('A', -2))
val ep3: List[Entry] = List(('C', -2), ('B', -1), ('A', -3), ('A', -2))

// * Monte Carlo First Visit Evaluation
def first_visit(list: List[Entry], target: Char, gamma: Double, i: Double = 0): Double =
    list match {
        // Reading through the tail of the list
        case ((char, value) :: xs) if char == target || i > 0 =>
            value * math.pow(gamma, i) + first_visit(xs, target, gamma, i + 1)
        // Wait until we hit the first target
        case (_ :: xs) => first_visit(xs, target, gamma, i)
        // Base case for empty list
        case _ => 0
    }

// * Simulate grid
type Path = Map[Char, List[(Char, Int)]]
val path: Path = Map(
    'A' -> List(
        ('B', -2),
        ('A', -2),
    ),
    'B' -> List(
        ('G', 100),
        ('G', 100),
        ('C', -2),
        ('B', -2),
    ),
    'C' -> List(
        ('B', -2),
        ('C', -2),
    ),
)

def pickPath(path: Path, location: Char) =
    scala.util.Random.shuffle(path(location)).head

def simulate(path: Path, location: Char, goal: Char): Int =
    if location == goal then
        0
    else {
        val (loc, value) = pickPath(path, location);
        return value + simulate(path, loc, goal);
    }
