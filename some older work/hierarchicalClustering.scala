type Coord = (Int, Int, Int)

val data: List[List[Coord]] = List(
    (367,174,3),
    (409,359,328),
    (229,427,206),
    (121,423,333),
    (107,375,499),
    (122,422,331),
    (2,446,21),
    (127,439,328),
    (250,83,350),
    (418,403,315)
).map(List(_))

def manhattanDistance(a: Coord, b: Coord): Int =
    (for (l, r) <- (a zip b).toList
        yield math.abs(l - r)).reduce(_ + _)

def minimumDistances(list: List[List[Coord]]): List[Int] = 
    // iter each cluster
    for a <- list
        // find minimum distance to another cluster
        yield (
            // iter each other cluster
            for b <- list.filter(_ != a)
                // iter each point on left
                yield (for left <- a
                    // iter each point on right
                    yield for right <- b
                        yield manhattanDistance(left, right)
                ).flatten.max
            ).min

def iterate(input: List[List[Coord]]): (Int, List[List[Coord]]) = {
    // find the minimum distance from between all clusters
    val distances = minimumDistances(input);
    
    // find the shortest distance between each cluster
    val shortestDistance = distances.min;

    // filter clusters not affected
    val clusters = (input zip distances)
        .filterNot(_._2 == shortestDistance)
        .map(_._1);

    // create new merged cluster out of closest clusters
    val newCluster = (input zip distances)
        .filter(_._2 == shortestDistance)
        .map(_._1)
        .flatten
        .toList;

    // return the new list of clusters
    (shortestDistance, newCluster :: clusters)
}

def iterToCompletion(input: List[List[Coord]]): Unit = {
    if input.length <= 1 then {
        return;
    }

    val (shortestDistance, newList) = iterate(input);
    println("shortest distance = " + shortestDistance);
    iterToCompletion(newList)
}

@main def main() = iterToCompletion(data);

// a = 4
// b = 27
// c = 66
// d = 370
// e = 523

// f = 3706627

// a x e x f
// 4 x 523 x 3706627
// = 07754263684
