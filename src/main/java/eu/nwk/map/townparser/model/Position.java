package eu.nwk.map.townparser.model;

import java.util.Objects;

public record Position<Type>(Type x, Type y) {

    @Override
    public boolean equals(Object object) {
        if (object == null) {
            return false;
        }
        Position<?> position = (Position<?>) object;
        return x().equals(position.x()) && y().equals(position.y());
    }

    @Override
    public int hashCode() {
        return Objects.hash(x(), y());
    }

    @Override
    public String toString() {
        return "Position{" +
                "x=" + x() +
                ", y=" + y() +
                '}';
    }
}
