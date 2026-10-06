package eu.nwk.map.townparser.model;

public record Town(String name, Position<Double> position, boolean isCity, TownSize size, int population) {
}
